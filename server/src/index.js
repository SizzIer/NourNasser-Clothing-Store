import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

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

app.get("/api/seed-products", async (req, res) => {
  try {
    const existingProducts = await prisma.product.findMany();

    if (existingProducts.length > 0) {
      return res.json({ message: "Products already exist" });
    }

    await prisma.product.createMany({
      data: [
        {
          name: "Lavender Hoodie",
          description: "Soft premium hoodie in lavender.",
          price: 65.0,
          imageUrl: "/images/lavender-hoodie.jpg",
          category: "Hoodies",
          stock: 15,
        },
        {
          name: "Classic Purple Tee",
          description: "Comfortable everyday t-shirt.",
          price: 30.0,
          imageUrl: "/images/purple-tee.jpg",
          category: "T-Shirts",
          stock: 25,
        },
        {
          name: "Oversized Crewneck",
          description: "Relaxed fit crewneck sweatshirt.",
          price: 55.0,
          imageUrl: "/images/crewneck.jpg",
          category: "Sweatshirts",
          stock: 12,
        }
      ],
    });

    res.json({ message: "Products seeded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to seed products" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();

    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.name,
      image: product.imageUrl.replace("/images/", ""),
      category: product.category.toLowerCase(),
      price: product.price,
      popularity: 5,
      stock: product.stock,
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();

    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.name,
      image: product.imageUrl.replace("/images/", ""),
      category: product.category.toLowerCase(),
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