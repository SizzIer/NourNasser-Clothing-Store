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

// Create order (both PayPal and other methods)
app.post("/api/orders", async (req, res) => {
  try {
    const { data, products, subtotal, user, orderStatus, orderDate } = req.body;

    if (!data || !products || subtotal === undefined) {
      return res.status(400).json({ error: "Missing required order data" });
    }

    const paymentMethod = data.paymentType || "credit-card";

    // Handle PayPal orders
    if (paymentMethod === "paypal") {
      // Create order in database with pending payment status
      const userId = user?.id ? Number(user.id) : null;

      const order = await prisma.order.create({
        data: {
          userId: userId,
          status: orderStatus || "Pending",
          paymentMethod: "paypal",
          paymentStatus: "Pending",
          total: subtotal,
          items: {
            create: products.map((product) => ({
              productId: parseInt(product.id, 10),
              quantity: product.quantity || 1,
              unitPrice: product.price || 0,
              size: product.size || null,
              color: product.color || null,
            })),
          },
        },
      });

      // Store order details for later retrieval
      const orderDetails = {
        orderId: order.id,
        customerData: data,
        products: products,
        subtotal: subtotal,
        user: user,
      };

      return res.status(201).json({
        success: true,
        orderId: order.id,
        message: "Order created, proceed to PayPal",
        orderDetails: orderDetails,
      });
    }

    // Handle other payment methods (credit card, eTransfer)
    const userId = user?.id ? Number(user.id) : null;

    const order = await prisma.order.create({
      data: {
        userId: userId,
        status: orderStatus || "Pending",
        paymentMethod: paymentMethod,
        paymentStatus: "Completed",
        total: subtotal,
        items: {
          create: products.map((product) => ({
            productId: parseInt(product.id, 10),
            quantity: product.quantity || 1,
            unitPrice: product.price || 0,
            size: product.size || null,
            color: product.color || null,
          })),
        },
      },
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

// Create PayPal payment
app.post("/api/paypal/create-payment", async (req, res) => {
  try {
    const { orderId, subtotal } = req.body;

    if (!orderId || !subtotal) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const accessToken = await getPayPalAccessToken();

    const paymentData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: parseFloat(subtotal).toFixed(2),
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
    const { orderId, paymentId } = req.body;

    if (!orderId || !paymentId) {
      return res.status(400).json({ error: "Missing required fields" });
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