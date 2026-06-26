import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import axios from "axios";

dotenv.config();

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

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
    const map = new Map();
    for (const p of products) {
      if (!map.has(p.category)) {
        map.set(p.category, { subcategories: new Set(), count: 0 });
      }
      const entry = map.get(p.category);
      entry.count += 1;
      if (p.subcategory) entry.subcategories.add(p.subcategory);
    }
    const list = [...map.entries()].map(([name, data]) => ({
      name,
      slug: slugify(name),
      productCount: data.count,
      subcategories: [...data.subcategories].sort((a, b) =>
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

function parseComposition(raw) {
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

function fabricSearchBlob(product) {
  const parts = [product.fabric, product.careInstructions];
  const comp = parseComposition(product.composition);
  if (comp) {
    for (const row of comp) {
      if (row && typeof row.fiber === "string") parts.push(row.fiber);
    }
  }
  const cols = parseColors(product.colors);
  if (cols) parts.push(...cols);
  return parts.filter(Boolean).join(" ").toLowerCase();
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

    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.name,
      description: product.description,
      image: product.imageUrl.replace("/images/", ""),
      category: product.category.toLowerCase(),
      categorySlug: slugify(product.category),
      subcategory: product.subcategory
        ? product.subcategory.toLowerCase()
        : null,
      fabric: product.fabric,
      composition: parseComposition(product.composition),
      careInstructions: product.careInstructions,
      colors: parseColors(product.colors),
      price: product.price,
      popularity: 5,
      stock: product.stock,
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
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

// ========== Admin Products ==========

app.get("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const { name, description, price, imageUrl, category, subcategory, stock, fabric, composition, careInstructions, colors } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: "name, price, and category are required" });
    }
    const product = await prisma.product.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        imageUrl: imageUrl || "",
        category,
        subcategory: subcategory || null,
        stock: Number(stock) || 0,
        fabric: fabric || null,
        composition: composition ? JSON.stringify(composition) : null,
        careInstructions: careInstructions || null,
        colors: colors ? JSON.stringify(colors) : null,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { name, description, price, imageUrl, category, subcategory, stock, fabric, composition, careInstructions, colors } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = Number(price);
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (category !== undefined) data.category = category;
    if (subcategory !== undefined) data.subcategory = subcategory || null;
    if (stock !== undefined) data.stock = Number(stock);
    if (fabric !== undefined) data.fabric = fabric || null;
    if (composition !== undefined) data.composition = composition ? JSON.stringify(composition) : null;
    if (careInstructions !== undefined) data.careInstructions = careInstructions || null;
    if (colors !== undefined) data.colors = colors ? JSON.stringify(colors) : null;

    const product = await prisma.product.update({ where: { id: productId }, data });
    res.json(product);
  } catch (error) {
    console.error(error);
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