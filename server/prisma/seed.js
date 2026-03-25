import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const prisma = new PrismaClient();

const products = [
  {
    name: "Long Sleeve Shirt",
    description: "Crisp long sleeve shirt for everyday wear.",
    price: 40,
    imageUrl: "/images/product-01.jpg",
    category: "Tops",
    subcategory: "Shirts",
    stock: 10,
  },
  {
    name: "Classic Tee",
    description: "Soft cotton crewneck t-shirt.",
    price: 30,
    imageUrl: "/images/product-02.jpg",
    category: "Tops",
    subcategory: "Shirts",
    stock: 20,
  },
  {
    name: "Tailored Shorts",
    description: "Lightweight shorts with a clean fit.",
    price: 25,
    imageUrl: "/images/product-03.jpg",
    category: "Bottoms",
    subcategory: "Shorts",
    stock: 15,
  },
  {
    name: "Straight Leg Pants",
    description: "Versatile pants for work or weekend.",
    price: 50,
    imageUrl: "/images/product-04.jpg",
    category: "Bottoms",
    subcategory: "Pants",
    stock: 12,
  },
  {
    name: "Merino Crewneck",
    description: "Fine-gauge knit crewneck sweater.",
    price: 45,
    imageUrl: "/images/product-05.jpg",
    category: "Tops",
    subcategory: "Sweaters",
    stock: 8,
  },
  {
    name: "Oversized Hoodie",
    description: "Relaxed hoodie with a premium hand-feel.",
    price: 60,
    imageUrl: "/images/oversizedCrewneck.jpg",
    category: "Tops",
    subcategory: "Hoodies",
    stock: 18,
  },
  {
    name: "Slim Jeans",
    description: "Stretch denim with a slim silhouette.",
    price: 55,
    imageUrl: "/images/product-06.jpg",
    category: "Bottoms",
    subcategory: "Jeans",
    stock: 14,
  },
  {
    name: "Linen Shirt",
    description: "Breathable linen blend for warm days.",
    price: 48,
    imageUrl: "/images/product-07.jpg",
    category: "Tops",
    subcategory: "Shirts",
    stock: 9,
  },
  {
    name: "Wool Scarf",
    description: "Soft accessory to finish any outfit.",
    price: 35,
    imageUrl: "/images/product-08.jpg",
    category: "Scarves",
    subcategory: "Wool",
    stock: 30,
  },
  {
    name: "Leather Belt",
    description: "Minimal belt with brushed hardware.",
    price: 42,
    imageUrl: "/images/product-09.jpg",
    category: "Accessories",
    subcategory: "Belts",
    stock: 22,
  },
  {
    name: "Canvas Tote",
    description: "Roomy tote for daily essentials.",
    price: 38,
    imageUrl: "/images/product-10.jpg",
    category: "Accessories",
    subcategory: "Bags",
    stock: 16,
  },
  {
    name: "Lavender Hoodie",
    description: "Soft premium hoodie in lavender.",
    price: 65,
    imageUrl: "/images/lavender-hoodie.jpg",
    category: "Tops",
    subcategory: "Hoodies",
    stock: 15,
  },
  {
    name: "Classic Purple Tee",
    description: "Comfortable everyday t-shirt.",
    price: 30,
    imageUrl: "/images/purple-tee.jpg",
    category: "Tops",
    subcategory: "Shirts",
    stock: 25,
  },
  {
    name: "Oversized Crewneck",
    description: "Relaxed fit crewneck sweatshirt.",
    price: 55,
    imageUrl: "/images/crewneck.jpg",
    category: "Tops",
    subcategory: "Sweaters",
    stock: 12,
  },
  {
    name: "Classic Leather Gloves",
    description: "Lined leather gloves for cold weather.",
    price: 44,
    imageUrl: "/images/product-11.jpg",
    category: "Gloves & Mittens",
    subcategory: "Gloves",
    stock: 24,
  },
  {
    name: "Winter Knit Mittens",
    description: "Cozy knit mittens with soft fleece lining.",
    price: 32,
    imageUrl: "/images/product-12.jpg",
    category: "Gloves & Mittens",
    subcategory: "Mittens",
    stock: 28,
  },
  {
    name: "Cashmere Blend Scarf",
    description: "Lightweight scarf in a soft cashmere blend.",
    price: 52,
    imageUrl: "/images/product-13.jpg",
    category: "Scarves",
    subcategory: "Cashmere",
    stock: 20,
  },
];

async function main() {
  const productCount = await prisma.product.count();
  const orderItemCount = await prisma.orderItem.count();
  const expected = products.length;
  const missingSubcategory = await prisma.product.count({
    where: { subcategory: null },
  });
  const staleLegacyAccessory = await prisma.product.findFirst({
    where: {
      category: "Accessories",
      OR: [
        { subcategory: "Gloves" },
        { subcategory: "Mittens" },
        { subcategory: "Scarves" },
      ],
    },
  });

  const REQUIRED_TOP_LEVEL = [
    "Tops",
    "Bottoms",
    "Accessories",
    "Gloves & Mittens",
    "Scarves",
  ];
  const distinctRows = await prisma.product.groupBy({
    by: ["category"],
  });
  const presentCategories = new Set(distinctRows.map((r) => r.category));
  const missingFiveWaySplit = REQUIRED_TOP_LEVEL.some(
    (c) => !presentCategories.has(c)
  );

  const shouldReseedProducts =
    !orderItemCount &&
    (productCount < expected ||
      (productCount > 0 && missingSubcategory > 0) ||
      staleLegacyAccessory != null ||
      (productCount > 0 && missingFiveWaySplit));

  if (shouldReseedProducts) {
    await prisma.product.deleteMany({});
    await prisma.product.createMany({ data: products });
    console.log(`Seeded ${products.length} products (full catalog with subcategories).`);
  } else if (productCount < expected && orderItemCount > 0) {
    console.warn(
      `Only ${productCount} products but seed defines ${expected}, and orders reference products. Run "npx prisma migrate reset" in server/ (or clear orders) then "npm run db:seed" to get the full catalog.`
    );
  } else {
    console.log("Product catalog already complete, skipping product seed.");
  }

  const demoEmail = "demo@example.com";
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Demo Customer",
        email: demoEmail,
        password: "demo123",
        role: "customer",
      },
    });
    console.log(`Seeded demo user: ${demoEmail} / demo123`);
  } else {
    console.log("Demo user already present, skipping user seed.");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
