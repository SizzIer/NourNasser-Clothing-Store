import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

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

app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();

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