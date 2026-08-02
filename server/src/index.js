import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import axios from "axios";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, "../public/uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const multerStorage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (JPG, PNG, GIF, WEBP, AVIF)"));
    }
  },
});

dotenv.config();

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/** "tops" / "TOPS" → "Tops"; keeps multi-word labels readable. */
function toDisplayCase(value) {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((word) => {
      if (word === "&") return word;
      if (word.length <= 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeSizeLabel(value) {
  return normalizeWhitespace(value).toUpperCase();
}

function normalizeColorLabel(value) {
  return toDisplayCase(value);
}

/**
 * Reuse an existing label when slug matches (case/spacing variants),
 * otherwise fall back to display-case. Prefer `preferred` list first
 * (e.g. CATEGORY_ORDER) so catalog names stay stable.
 */
function resolveLabel(input, existingLabels, preferred = []) {
  const cleaned = normalizeWhitespace(input);
  if (!cleaned) return "";
  const want = slugify(cleaned);
  for (const name of preferred) {
    if (slugify(name) === want) return name;
  }
  for (const name of existingLabels) {
    if (name && slugify(name) === want) return name;
  }
  return toDisplayCase(cleaned);
}

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/", (req, res) => {
  res.send("Backend server is running");
});

app.get("/api/health", (req, res) => {
  res.json({ message: "API is running" });
});

function splitFullName(fullName) {
  const clean = (fullName || "").trim();
  if (!clean) return { name: "", lastname: "" };
  const [first, ...rest] = clean.split(/\s+/);
  return { name: first, lastname: rest.join(" ") };
}

function toPublicUser(user) {
  const split = splitFullName(user.name);
  return {
    id: user.id,
    name: split.name,
    lastname: split.lastname,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, lastname, email, phone, password } = req.body;
    if (!name || !lastname || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const createdUser = await prisma.user.create({
      data: {
        name: `${String(name).trim()} ${String(lastname).trim()}`.trim(),
        email: normalizedEmail,
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
        password: hashedPassword,
      },
    });

    return res.status(201).json(toPublicUser(createdUser));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const rawPassword = String(password);
    let passwordMatches = await bcrypt.compare(rawPassword, user.password);
    if (!passwordMatches && user.password === rawPassword) {
      passwordMatches = true;
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(rawPassword, 10) },
      });
    }
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json(toPublicUser(user));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to login" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(toPublicUser(user));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const { name, lastname, email, phone, password } = req.body;
    const data = {};

    if (typeof name === "string" || typeof lastname === "string") {
      const current = await prisma.user.findUnique({ where: { id: userId } });
      if (!current) return res.status(404).json({ error: "User not found" });
      const split = splitFullName(current.name);
      const nextName = typeof name === "string" && name.trim() ? name.trim() : split.name;
      const nextLastname =
        typeof lastname === "string" && lastname.trim()
          ? lastname.trim()
          : split.lastname;
      data.name = `${nextName} ${nextLastname}`.trim();
    }

    if (typeof email === "string" && email.trim()) {
      data.email = email.trim().toLowerCase();
    }

    if (typeof phone === "string") {
      data.phone = phone.trim() ? phone.trim() : null;
    }

    if (typeof password === "string" && password.trim()) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return res.json(toPublicUser(updated));
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error(error);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

const CATEGORY_ORDER = [
  "Tops",
  "Bottoms",
  "Accessories",
  "Gloves & Mittens",
  "Scarves",
];

app.get("/api/categories", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: { category: true, subcategory: true },
    });
    // Group by slug so "Tops" / "tops" / " TOPS " collapse into one nav entry.
    const map = new Map();
    for (const p of products) {
      if (!p.category) continue;
      const catSlug = slugify(p.category);
      if (!catSlug) continue;
      if (!map.has(catSlug)) {
        map.set(catSlug, {
          name: resolveLabel(p.category, [], CATEGORY_ORDER),
          subcategories: new Map(),
          count: 0,
        });
      }
      const entry = map.get(catSlug);
      entry.count += 1;
      if (p.subcategory) {
        const subSlug = slugify(p.subcategory);
        if (subSlug && !entry.subcategories.has(subSlug)) {
          entry.subcategories.set(subSlug, toDisplayCase(p.subcategory));
        }
      }
    }
    const list = [...map.entries()].map(([slug, data]) => ({
      name: data.name,
      slug,
      productCount: data.count,
      subcategories: [...data.subcategories.values()].sort((a, b) =>
        a.localeCompare(b)
      ),
    }));
    list.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a.name);
      const ib = CATEGORY_ORDER.indexOf(b.name);
      const fallback = 100;
      return (ia === -1 ? fallback : ia) - (ib === -1 ? fallback : ib);
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

function parseColors(raw) {
  if (raw == null || raw === "") return null;
  if (Array.isArray(raw)) {
    return raw.every((x) => typeof x === "string") ? raw : null;
  }
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) && v.every((x) => typeof x === "string")
        ? v
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function parseJsonArray(raw) {
  if (raw == null || raw === "") return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  }
  return null;
}

function resolveImagePath(imageUrl) {
  if (!imageUrl) return "";
  // Uploaded files and external URLs pass through unchanged
  if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("http")) return imageUrl;
  // Legacy /images/filename.jpg → strip prefix (frontend prepends /assets/)
  return imageUrl.replace(/^\/images\//, "");
}

function fabricSearchBlob(product) {
  const parts = [product.fabric, product.careInstructions];
  const cols = parseColors(product.colors);
  if (cols) parts.push(...cols);
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function formatStorefrontProduct(product) {
  const rawImages = parseColors(product.images);
  const resolvedImages =
    rawImages && rawImages.length > 0
      ? rawImages.map(resolveImagePath)
      : [resolveImagePath(product.imageUrl)].filter(Boolean);
  const inventoryRows = parseJsonArray(product.inventory);
  const totalStock =
    inventoryRows && inventoryRows.length > 0
      ? inventoryRows.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)
      : product.stock;
  return {
    id: product.id,
    title: product.name,
    description: product.description,
    image: resolveImagePath(product.imageUrl),
    images: resolvedImages,
    category: product.category.toLowerCase(),
    categorySlug: slugify(product.category),
    subcategory: product.subcategory
      ? product.subcategory.toLowerCase()
      : null,
    fabric: product.fabric,
    careInstructions: product.careInstructions,
    colors: parseColors(product.colors),
    inventory: inventoryRows,
    price: product.price,
    popularity: 5,
    stock: totalStock,
  };
}

async function uniqueCollectionSlug(name, excludeId = null) {
  // Reserve "featured" for GET /api/collections/featured
  let base = slugify(name) || "collection";
  if (base === "featured") base = "featured-collection";
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await prisma.collection.findUnique({ where: { slug } });
    if (!existing || (excludeId != null && existing.id === excludeId)) {
      return slug;
    }
    slug = `${base}-${n++}`;
  }
}

async function ensureExclusiveFeatured(collectionId) {
  await prisma.$transaction([
    prisma.collection.updateMany({
      where: { id: { not: collectionId } },
      data: { isFeatured: false },
    }),
    prisma.collection.update({
      where: { id: collectionId },
      data: { isFeatured: true },
    }),
  ]);
}

function normalizeCollectionProductIds(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const ids = [];
  for (const entry of value) {
    const id = Number(entry);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

async function replaceCollectionProducts(collectionId, productIds) {
  const requested = normalizeCollectionProductIds(productIds);
  const existingProducts =
    requested.length === 0
      ? []
      : await prisma.product.findMany({
          where: { id: { in: requested } },
          select: { id: true },
        });
  const valid = new Set(existingProducts.map((p) => p.id));
  const ids = requested.filter((id) => valid.has(id));

  await prisma.collectionProduct.deleteMany({ where: { collectionId } });
  if (ids.length === 0) return;
  await prisma.collectionProduct.createMany({
    data: ids.map((productId, index) => ({
      collectionId,
      productId,
      sortOrder: index,
    })),
  });
}

/** Add/remove product↔collection links without reshuffling other members' order. */
async function syncProductCollections(productId, collectionIds) {
  const requested = normalizeCollectionProductIds(collectionIds);
  const existingCollections =
    requested.length === 0
      ? []
      : await prisma.collection.findMany({
          where: { id: { in: requested } },
          select: { id: true },
        });
  const validIds = existingCollections.map((c) => c.id);
  const want = new Set(validIds);

  const current = await prisma.collectionProduct.findMany({
    where: { productId },
  });
  const currentByCollection = new Map(
    current.map((row) => [row.collectionId, row])
  );

  const toRemove = current
    .filter((row) => !want.has(row.collectionId))
    .map((row) => row.id);
  if (toRemove.length > 0) {
    await prisma.collectionProduct.deleteMany({
      where: { id: { in: toRemove } },
    });
  }

  for (const collectionId of validIds) {
    if (currentByCollection.has(collectionId)) continue;
    const max = await prisma.collectionProduct.aggregate({
      where: { collectionId },
      _max: { sortOrder: true },
    });
    await prisma.collectionProduct.create({
      data: {
        collectionId,
        productId,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }
}

function serializeAdminCollection(collection) {
  const rows = [...(collection.products || [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    isFeatured: collection.isFeatured,
    createdAt: collection.createdAt,
    productCount: rows.length,
    productIds: rows.map((row) => row.productId),
    products: rows
      .map((row) => row.product)
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: resolveImagePath(p.imageUrl),
        price: p.price,
        category: p.category,
      })),
  };
}

app.get("/api/products", async (req, res) => {
  try {
    const rawFabric = req.query.fabric;
    const fabricFilter =
      typeof rawFabric === "string" && rawFabric.trim()
        ? rawFabric.trim()
        : null;

    let products = await prisma.product.findMany();
    if (fabricFilter) {
      const n = fabricFilter.toLowerCase();
      products = products.filter((p) => fabricSearchBlob(p).includes(n));
    }

    res.json(products.map(formatStorefrontProduct));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ========== Public Collections ==========

app.get("/api/collections", async (_req, res) => {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        products: { select: { productId: true } },
      },
    });
    res.json(
      collections.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        isFeatured: c.isFeatured,
        productCount: c.products.length,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

app.get("/api/collections/featured", async (_req, res) => {
  try {
    const collection = await prisma.collection.findFirst({
      where: { isFeatured: true },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: { product: true },
        },
      },
    });
    if (!collection) {
      return res.json(null);
    }
    res.json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      isFeatured: collection.isFeatured,
      products: collection.products.map((row) =>
        formatStorefrontProduct(row.product)
      ),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch featured collection" });
  }
});

app.get("/api/collections/:slug", async (req, res) => {
  try {
    const collection = await prisma.collection.findUnique({
      where: { slug: String(req.params.slug) },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: { product: true },
        },
      },
    });
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    res.json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      isFeatured: collection.isFeatured,
      products: collection.products.map((row) =>
        formatStorefrontProduct(row.product)
      ),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch collection" });
  }
});

// ========== PayPal Configuration ==========
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "production"
    ? "https://api.paypal.com"
    : "https://api.sandbox.paypal.com";

// Get PayPal Access Token
async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error(
      "PAYPAL_CLIENT_ID / PAYPAL_SECRET are not set. Copy server/.env.example to server/.env and fill in your PayPal sandbox credentials."
    );
  }
  try {
    const response = await axios.post(
      `${PAYPAL_API_BASE}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        auth: {
          username: PAYPAL_CLIENT_ID,
          password: PAYPAL_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Failed to get PayPal access token:", error.message);
    throw error;
  }
}

// ========== Orders Endpoints ==========

/** Prices and totals from SQLite — never trust cart amounts sent by the browser. */
async function resolveCartLineItems(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("Cart is empty");
  }

  const productIds = products.map((p) => parseInt(p.id, 10));
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const dbById = new Map(dbProducts.map((p) => [p.id, p]));

  const items = [];
  let total = 0;

  for (const cartItem of products) {
    const productId = parseInt(cartItem.id, 10);
    const dbProduct = dbById.get(productId);
    if (!dbProduct) {
      throw new Error(`Product ${productId} not found`);
    }
    const quantity = Math.max(1, parseInt(cartItem.quantity, 10) || 1);
    const unitPrice = dbProduct.price;
    total += unitPrice * quantity;
    items.push({
      productId,
      quantity,
      unitPrice,
      size: cartItem.size || null,
      color: cartItem.color || null,
    });
  }

  return { items, total: Math.round(total * 100) / 100 };
}

function resolveOrderUserId(user) {
  if (user?.id == null || user.id === "") return null;
  const userId = Number(user.id);
  return Number.isNaN(userId) ? null : userId;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isValidPostalCode(code) {
  return (
    code.length >= 3 &&
    code.length <= 12 &&
    /^[A-Za-z0-9][A-Za-z0-9\s-]*$/.test(code)
  );
}

function isValidName(name) {
  return name.length >= 2;
}

function isValidAddressLine(line) {
  return line.length >= 3;
}

function isValidCardNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19;
}

function isValidExpirationDate(value) {
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(String(value ?? "").trim());
}

function isValidCvc(value) {
  return /^\d{3,4}$/.test(String(value ?? "").trim());
}

function assertFormat(value, label, isValid) {
  if (!isValid(value)) {
    throw new Error(`Please enter a valid ${label.toLowerCase()}`);
  }
}

function validateCardData(data) {
  const cardNumber = String(data?.cardNumber ?? "").trim();
  const nameOnCard = String(data?.nameOnCard ?? "").trim();
  const expirationDate = String(data?.expirationDate ?? "").trim();
  const cvc = String(data?.cvc ?? "").trim();

  const required = [
    [cardNumber, "Card number"],
    [nameOnCard, "Name on card"],
    [expirationDate, "Expiration date"],
    [cvc, "CVC"],
  ];

  for (const [value, label] of required) {
    if (!value) {
      throw new Error(`${label} is required`);
    }
  }

  assertFormat(cardNumber, "card number", isValidCardNumber);
  assertFormat(nameOnCard, "name on card", isValidName);
  assertFormat(expirationDate, "expiration date (MM/YY)", isValidExpirationDate);
  assertFormat(cvc, "CVC", isValidCvc);
}

function validateAndNormalizeCustomerData(data) {
  const email = String(data?.emailAddress ?? "").trim().toLowerCase();
  const firstName = String(data?.firstName ?? "").trim();
  const lastName = String(data?.lastName ?? "").trim();
  const phone = String(data?.phone ?? "").trim();
  const address = String(data?.address ?? "").trim();
  const city = String(data?.city ?? "").trim();
  const country = String(data?.country ?? "").trim();
  const region = String(data?.region ?? "").trim();
  const postalCode = String(data?.postalCode ?? "").trim();

  const required = [
    [email, "Email address"],
    [firstName, "First name"],
    [lastName, "Last name"],
    [phone, "Phone"],
    [address, "Address"],
    [city, "City"],
    [country, "Country"],
    [region, "Region"],
    [postalCode, "Postal code"],
  ];

  for (const [value, label] of required) {
    if (!value) {
      throw new Error(`${label} is required`);
    }
  }

  assertFormat(email, "email address", isValidEmail);
  assertFormat(firstName, "first name", isValidName);
  assertFormat(lastName, "last name", isValidName);
  assertFormat(phone, "phone number", isValidPhone);
  assertFormat(address, "address", isValidAddressLine);
  assertFormat(city, "city", isValidName);
  assertFormat(region, "region", isValidName);
  assertFormat(postalCode, "postal code", isValidPostalCode);

  return {
    email,
    firstName,
    lastName,
    phone,
    company: String(data?.company ?? "").trim() || null,
    address,
    apartment: String(data?.apartment ?? "").trim() || null,
    city,
    country,
    region,
    postalCode,
  };
}

function buildOrderCreateData({ userId, orderStatus, paymentMethod, paymentStatus, total, lineItems, customer }) {
  return {
    userId,
    status: orderStatus || "Pending",
    paymentMethod,
    paymentStatus,
    total,
    ...customer,
    items: { create: lineItems.items },
  };
}

// Create order (both PayPal and other methods)
app.post("/api/orders", async (req, res) => {
  try {
    const { data, products, user, orderStatus } = req.body;

    if (!data || !products) {
      return res.status(400).json({ error: "Missing required order data" });
    }

    let lineItems;
    try {
      lineItems = await resolveCartLineItems(products);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    let customer;
    try {
      customer = validateAndNormalizeCustomerData(data);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const paymentMethod = data.paymentType || "credit-card";

    if (paymentMethod === "credit-card") {
      try {
        validateCardData(data);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    // Handle PayPal orders
    if (paymentMethod === "paypal") {
      const userId = resolveOrderUserId(user);

      const order = await prisma.order.create({
        data: buildOrderCreateData({
          userId,
          orderStatus,
          paymentMethod: "paypal",
          paymentStatus: "Pending",
          total: lineItems.total,
          lineItems,
          customer,
        }),
      });

      return res.status(201).json({
        success: true,
        orderId: order.id,
        message: "Order created, proceed to PayPal",
        total: lineItems.total,
      });
    }

    // Demo-only: credit card / eTransfer are marked completed without a real gateway.
    const userId = resolveOrderUserId(user);

    const order = await prisma.order.create({
      data: buildOrderCreateData({
        userId,
        orderStatus,
        paymentMethod,
        paymentStatus: "Completed",
        total: lineItems.total,
        lineItems,
        customer,
      }),
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Order creation error:", error?.message || error);
    return res.status(500).json({ error: "Failed to create order", details: error?.message });
  }
});

// Get order by ID
app.get("/api/orders/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Get user orders
app.get("/api/users/:userId/orders", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ========== PayPal Specific Endpoints ==========

// Create PayPal payment (sandbox demo — amount always comes from the DB order)
app.post("/api/paypal/create-payment", async (req, res) => {
  try {
    const orderId = Number(req.body.orderId);
    if (!orderId || Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.paymentMethod !== "paypal") {
      return res.status(400).json({ error: "Order is not a PayPal order" });
    }
    if (order.paymentStatus !== "Pending") {
      return res.status(400).json({ error: "Order payment is not pending" });
    }

    const accessToken = await getPayPalAccessToken();
    const amount = order.total.toFixed(2);

    const paymentData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          description: `Order #${orderId} - Nour Nasser Clothing`,
          custom_id: orderId.toString(),
        },
      ],
      application_context: {
        return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/order-confirmation?orderId=${orderId}`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/checkout`,
        brand_name: "Nour Nasser Clothing",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    };

    const response = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders`,
      paymentData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const approvalUrl = response.data.links.find(
      (link) => link.rel === "approve"
    )?.href;

    if (!approvalUrl) {
      return res.status(400).json({ error: "No approval URL from PayPal" });
    }

    return res.json({
      paymentId: response.data.id,
      approvalUrl: approvalUrl,
    });
  } catch (error) {
    const errData = error.response?.data;
    console.error("PayPal payment creation error:", JSON.stringify(errData || error.message, null, 2));
    return res.status(500).json({
      error: "Failed to create PayPal payment",
      details: errData?.details?.[0]?.description || errData?.message || error.message,
    });
  }
});

// Execute PayPal payment (after user approval)
app.post("/api/paypal/capture-payment", async (req, res) => {
  try {
    const orderId = Number(req.body.orderId);
    const { paymentId } = req.body;

    if (!orderId || Number.isNaN(orderId) || !paymentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.paymentStatus === "Completed") {
      return res.json({
        success: true,
        message: "Payment already captured",
        orderId,
      });
    }

    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${paymentId}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.status === "COMPLETED") {
      const purchaseUnit = response.data.purchase_units?.[0];
      if (purchaseUnit?.custom_id && purchaseUnit.custom_id !== String(orderId)) {
        return res.status(400).json({ error: "PayPal order does not match store order" });
      }

      const capturedAmount = parseFloat(
        purchaseUnit?.payments?.captures?.[0]?.amount?.value ?? "0"
      );
      if (Math.abs(capturedAmount - order.total) > 0.01) {
        return res.status(400).json({ error: "Captured amount does not match order total" });
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "Processing",
          paymentStatus: "Completed",
        },
      });

      return res.json({
        success: true,
        message: "Payment captured successfully",
        orderId: orderId,
      });
    } else {
      return res.status(400).json({
        error: "Payment capture failed",
        status: response.data.status,
      });
    }
  } catch (error) {
    console.error("PayPal capture error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to capture PayPal payment",
      details: error.response?.data?.message,
    });
  }
});

// ========== Admin Middleware ==========

async function requireAdmin(req, res, next) {
  try {
    const userId = Number(req.headers["x-admin-id"]);
    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Auth check failed" });
  }
}

app.put("/api/admin/password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }

    const currentValue = String(currentPassword).trim();
    const nextValue = String(newPassword).trim();
    if (!currentValue || !nextValue) {
      return res.status(400).json({ error: "Current and new password are required" });
    }
    if (nextValue.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const passwordMatches = await bcrypt.compare(currentValue, req.adminUser.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(nextValue, 10);
    await prisma.user.update({
      where: { id: req.adminUser.id },
      data: { password: hashedPassword },
    });

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update password" });
  }
});

// ========== Admin Stats ==========

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [revenueAgg, orderCount, customerCount, productCount] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "Completed" } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.product.count(),
    ]);

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true, items: true },
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const completedOrders = await prisma.order.findMany({
      where: { paymentStatus: "Completed", createdAt: { gte: sixMonthsAgo } },
      select: { total: true, createdAt: true },
    });

    const monthlyRevenue = {};
    for (const order of completedOrders) {
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + order.total;
    }

    res.json({
      totalRevenue: revenueAgg._sum.total || 0,
      orderCount,
      customerCount,
      productCount,
      recentOrders,
      monthlyRevenue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ========== Admin Upload ==========

app.post("/api/admin/upload", requireAdmin, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// ========== Admin Orders ==========

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status || undefined;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: true, items: { include: { product: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.put("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status required" });

    const order = await prisma.order.update({ where: { id: orderId }, data: { status } });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

function normalizeAdminProductInventory(value) {
  if (!Array.isArray(value)) return [];
  const merged = new Map();
  for (const row of value) {
    const size = normalizeSizeLabel(
      typeof row?.size === "string" ? row.size : String(row?.size ?? "")
    );
    const color = normalizeColorLabel(
      typeof row?.color === "string" ? row.color : String(row?.color ?? "")
    );
    const stock = Number(row?.stock) || 0;
    if (!size && !color && stock <= 0) continue;
    // Collapse "m"/"M" + "black"/"Black" into one SKU.
    const key = `${size.toLowerCase()}|${slugify(color)}`;
    const prev = merged.get(key);
    if (prev) {
      prev.stock += stock;
    } else {
      merged.set(key, { size, color, stock });
    }
  }
  return [...merged.values()];
}

function normalizeAdminProductColors(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const color = normalizeColorLabel(item);
    if (!color) continue;
    const key = slugify(color);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(color);
  }
  return result;
}

async function resolveProductCategoryFields(categoryInput, subcategoryInput) {
  const existing = await prisma.product.findMany({
    select: { category: true, subcategory: true },
  });
  const categoryNames = [
    ...new Set(existing.map((p) => p.category).filter(Boolean)),
  ];
  const category = resolveLabel(categoryInput, categoryNames, CATEGORY_ORDER);
  if (!category) {
    return { category: "", subcategory: null };
  }

  const subcategoryNames = [
    ...new Set(
      existing
        .filter((p) => p.category && slugify(p.category) === slugify(category))
        .map((p) => p.subcategory)
        .filter(Boolean)
    ),
  ];
  const subcategoryRaw = normalizeWhitespace(subcategoryInput);
  const subcategory = subcategoryRaw
    ? resolveLabel(subcategoryRaw, subcategoryNames)
    : null;

  return { category, subcategory };
}

function normalizeAdminProductImages(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => typeof entry === "string" && entry.trim()).map((entry) => entry.trim());
}

// ========== Admin Products ==========

app.get("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        collections: { select: { collectionId: true } },
      },
    });
    res.json(
      products.map(({ collections, ...product }) => ({
        ...product,
        collectionIds: collections.map((row) => row.collectionId),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const { name, description, price, imageUrl, images, inventory, category, subcategory, stock, fabric, careInstructions, colors, collectionIds } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: "name, price, and category are required" });
    }

    const imageArr = normalizeAdminProductImages(images);
    const primaryUrl = imageArr[0] || String(imageUrl || "").trim();
    const inventoryArr = normalizeAdminProductInventory(inventory);
    const safeColors = normalizeAdminProductColors(colors);
    const { category: resolvedCategory, subcategory: resolvedSubcategory } =
      await resolveProductCategoryFields(category, subcategory);
    if (!resolvedCategory) {
      return res.status(400).json({ error: "name, price, and category are required" });
    }
    const totalStock = inventoryArr.length > 0
      ? inventoryArr.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)
      : Number(stock) || 0;

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        description: String(description || "").trim(),
        price: Number(price),
        imageUrl: primaryUrl,
        images: imageArr.length > 0 ? JSON.stringify(imageArr) : null,
        inventory: inventoryArr.length > 0 ? JSON.stringify(inventoryArr) : null,
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        stock: totalStock,
        fabric: typeof fabric === "string" && fabric.trim() ? fabric.trim() : null,
        careInstructions: typeof careInstructions === "string" && careInstructions.trim() ? careInstructions.trim() : null,
        colors: safeColors.length > 0 ? JSON.stringify(safeColors) : null,
      },
    });

    if (collectionIds !== undefined) {
      await syncProductCollections(product.id, collectionIds);
    }

    const memberships = await prisma.collectionProduct.findMany({
      where: { productId: product.id },
      select: { collectionId: true },
    });
    res.status(201).json({
      ...product,
      collectionIds: memberships.map((row) => row.collectionId),
    });
  } catch (error) {
    console.error("Failed to create product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { name, description, price, imageUrl, images, inventory, category, subcategory, stock, fabric, careInstructions, colors, collectionIds } = req.body;
    const data = {};

    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = String(description || "").trim();
    if (price !== undefined) data.price = Number(price);
    if (images !== undefined) {
      const imageArr = normalizeAdminProductImages(images);
      data.images = imageArr.length > 0 ? JSON.stringify(imageArr) : null;
      data.imageUrl = imageArr[0] || String(imageUrl || "").trim();
    } else if (imageUrl !== undefined) {
      data.imageUrl = String(imageUrl || "").trim();
    }
    if (inventory !== undefined) {
      const inventoryArr = normalizeAdminProductInventory(inventory);
      data.inventory = inventoryArr.length > 0 ? JSON.stringify(inventoryArr) : null;
      data.stock = inventoryArr.length > 0
        ? inventoryArr.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)
        : Number(stock) || 0;
    } else if (stock !== undefined) {
      data.stock = Number(stock);
    }
    if (category !== undefined || subcategory !== undefined) {
      const current =
        category === undefined || subcategory === undefined
          ? await prisma.product.findUnique({
              where: { id: productId },
              select: { category: true, subcategory: true },
            })
          : null;
      const resolved = await resolveProductCategoryFields(
        category !== undefined ? category : current?.category,
        subcategory !== undefined ? subcategory : current?.subcategory
      );
      if (category !== undefined) {
        if (!resolved.category) {
          return res.status(400).json({ error: "category is required" });
        }
        data.category = resolved.category;
      }
      if (subcategory !== undefined) {
        data.subcategory = resolved.subcategory;
      }
    }
    if (fabric !== undefined) data.fabric = typeof fabric === "string" && fabric.trim() ? fabric.trim() : null;
    if (careInstructions !== undefined) {
      data.careInstructions = typeof careInstructions === "string" && careInstructions.trim() ? careInstructions.trim() : null;
    }
    if (colors !== undefined) {
      const safeColors = normalizeAdminProductColors(colors);
      data.colors = safeColors.length > 0 ? JSON.stringify(safeColors) : null;
    }

    const product = await prisma.product.update({ where: { id: productId }, data });

    if (collectionIds !== undefined) {
      await syncProductCollections(productId, collectionIds);
    }

    const memberships = await prisma.collectionProduct.findMany({
      where: { productId },
      select: { collectionId: true },
    });
    res.json({
      ...product,
      collectionIds: memberships.map((row) => row.collectionId),
    });
  } catch (error) {
    console.error("Failed to update product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    await prisma.product.delete({ where: { id: productId } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ========== Admin Collections ==========

app.get("/api/admin/collections", requireAdmin, async (_req, res) => {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
                category: true,
              },
            },
          },
        },
      },
    });
    res.json(collections.map(serializeAdminCollection));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

app.get("/api/admin/collections/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
                category: true,
              },
            },
          },
        },
      },
    });
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    res.json(serializeAdminCollection(collection));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch collection" });
  }
});

app.post("/api/admin/collections", requireAdmin, async (req, res) => {
  try {
    const { name, description, isFeatured, productIds } = req.body;
    const cleanedName = normalizeWhitespace(name);
    if (!cleanedName) {
      return res.status(400).json({ error: "name is required" });
    }
    const slug = await uniqueCollectionSlug(cleanedName);
    const collection = await prisma.collection.create({
      data: {
        name: cleanedName,
        slug,
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
        isFeatured: false,
      },
    });

    if (productIds !== undefined) {
      await replaceCollectionProducts(collection.id, productIds);
    }
    if (isFeatured) {
      await ensureExclusiveFeatured(collection.id);
    }

    const full = await prisma.collection.findUnique({
      where: { id: collection.id },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
                category: true,
              },
            },
          },
        },
      },
    });
    res.status(201).json(serializeAdminCollection(full));
  } catch (error) {
    console.error("Failed to create collection:", error);
    res.status(500).json({ error: "Failed to create collection" });
  }
});

app.put("/api/admin/collections/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const { name, description, isFeatured, productIds } = req.body;
    const data = {};

    if (name !== undefined) {
      const cleanedName = normalizeWhitespace(name);
      if (!cleanedName) {
        return res.status(400).json({ error: "name is required" });
      }
      data.name = cleanedName;
      if (slugify(cleanedName) !== slugify(existing.name)) {
        data.slug = await uniqueCollectionSlug(cleanedName, id);
      }
    }
    if (description !== undefined) {
      data.description =
        typeof description === "string" && description.trim()
          ? description.trim()
          : null;
    }

    if (Object.keys(data).length > 0) {
      await prisma.collection.update({ where: { id }, data });
    }
    if (productIds !== undefined) {
      await replaceCollectionProducts(id, productIds);
    }
    if (isFeatured === true) {
      await ensureExclusiveFeatured(id);
    } else if (isFeatured === false) {
      await prisma.collection.update({
        where: { id },
        data: { isFeatured: false },
      });
    }

    const full = await prisma.collection.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
                category: true,
              },
            },
          },
        },
      },
    });
    res.json(serializeAdminCollection(full));
  } catch (error) {
    console.error("Failed to update collection:", error);
    res.status(500).json({ error: "Failed to update collection" });
  }
});

app.delete("/api/admin/collections/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.collection.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete collection" });
  }
});

// ========== Admin Customers ==========

app.get("/api/admin/customers", requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
    res.json(
      users.map((u) => ({
        ...toPublicUser(u),
        orderCount: u._count.orders,
        createdAt: u.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// ========== End Admin ==========

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});