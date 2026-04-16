import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});