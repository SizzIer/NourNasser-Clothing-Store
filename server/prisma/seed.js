import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const prisma = new PrismaClient();

function productRowForDb(p) {
  return {
    ...p,
    colors: p.colors != null ? JSON.stringify(p.colors) : null,
  };
}

const products = [
  {
    name: "Long Sleeve Shirt",
    description: "Crisp long sleeve shirt for everyday wear.",
    price: 40,
    imageUrl: "/images/long-sleeve-shirt.jpg",
    category: "Tops",
    subcategory: "Shirts",
    stock: 10,
    fabric:
      "100% cotton poplin, plain weave—light, crisp, and breathable.",
    careInstructions:
      "Machine wash cold, similar colors.\nTumble dry low or line dry.\nWarm iron on cotton setting if needed.\nDo not bleach.",
    colors: ["White", "Sky blue", "Black"],
  },
  {
    name: "Classic Tee",
    description: "Soft cotton crewneck t-shirt.",
    price: 30,
    imageUrl: "/images/classic-tee.jpg",
    category: "Tops",
    subcategory: "Shirts",
    stock: 20,
    fabric: "100% cotton, ring-spun combed jersey.",
    careInstructions:
      "Machine wash cold.\nTumble dry low.\nDo not bleach.\nCool iron if needed.",
    colors: ["White", "Black", "Heather grey"],
  },
  {
    name: "Relaxed Fit Pants",
    description:
      "Easy pull-on pants with a relaxed leg and elastic waist—comfortable for home, travel, or laid-back days out.",
    price: 52,
    imageUrl: "/images/relaxed-fit-pants.jpg",
    category: "Bottoms",
    subcategory: "Pants",
    stock: 14,
    fabric:
      "97% cotton, 3% elastane twill with a touch of stretch for ease when you sit and move.",
    careInstructions:
      "Machine wash cold with like colors.\nTumble dry low.\nWarm iron if needed.\nDo not bleach.",
    colors: ["Black", "Khaki", "Navy"],
  },
  {
    name: "Relaxed Fit Joggers",
    description:
      "Tapered joggers with a relaxed seat and ribbed cuffs—pair with tees or hoodies for an easy uniform.",
    price: 48,
    imageUrl: "/images/relaxed-fit-joggers.jpg",
    category: "Bottoms",
    subcategory: "Joggers",
    stock: 16,
    fabric:
      "80% cotton, 20% polyester mid-weight fleece with a smooth outside and soft brushed interior.",
    careInstructions:
      "Machine wash cold, inside out, with like colors.\nTumble dry low.\nDo not bleach.",
    colors: ["Black", "Charcoal", "Oatmeal"],
  },
  {
    name: "Essential Hoodie",
    description: "Everyday pullover hoodie in soft brushed fleece.",
    price: 60,
    imageUrl: "/images/essential-hoodie.jpg",
    category: "Tops",
    subcategory: "Hoodies",
    stock: 18,
    fabric: "80% cotton, 20% polyester brushed-back fleece.",
    careInstructions:
      "Machine wash cold, inside out, with like colors.\nTumble dry low; remove promptly to reduce pilling.\nDo not iron prints or drawcord tips.\nDo not bleach.",
    colors: ["Black", "Grey", "Oatmeal"],
  },
  {
    name: "Wool Scarf",
    description:
      "Warm wool scarf with clean edges—long enough to loop once or drape loose.",
    price: 35,
    imageUrl: "/images/wool-scarf.jpg",
    category: "Scarves",
    subcategory: "Wool",
    stock: 30,
    fabric: "100% merino wool, lightweight plain weave.",
    careInstructions:
      "Hand wash cold with wool detergent, or dry clean.\nLay flat to dry; do not wring or tumble dry.\nSteam to refresh between wears.\nStore folded.",
    colors: ["Camel", "Charcoal", "Ivory"],
  },
  {
    name: "Leather Belt",
    description: "Minimal belt with brushed hardware.",
    price: 42,
    imageUrl: "/images/leather-belt.jpg",
    category: "Accessories",
    subcategory: "Belts",
    stock: 22,
    fabric:
      "Full-grain cowhide leather strap (100%) with a brushed zinc-alloy buckle.",
    careInstructions:
      "Leather: wipe with a soft dry or slightly damp cloth; air dry away from radiators.\nCondition 1–2× per year with a neutral leather cream.\nDo not soak or machine wash.\nHardware may be wiped dry; avoid harsh solvents.",
    colors: ["Black", "Brown", "Tan"],
  },
  {
    name: "Tote Bag",
    description:
      "Roomy everyday tote with reinforced handles—groceries, laptop, or a weekend carry-all.",
    price: 38,
    imageUrl: "/images/tote-bag.jpg",
    category: "Accessories",
    subcategory: "Bags",
    stock: 16,
    fabric: "100% cotton, heavy plain-weave canvas.",
    careInstructions:
      "Spot clean first; if needed, hand wash cold with mild detergent.\nAir dry flat; canvas may shrink slightly on hot washes.\nDo not bleach.\nIron medium if wrinkled.",
    colors: ["Natural", "Black", "Olive"],
  },
  {
    name: "Oversized Crewneck",
    description: "Relaxed fit crewneck sweatshirt.",
    price: 55,
    imageUrl: "/images/crewneck.jpg",
    category: "Tops",
    subcategory: "Sweaters",
    stock: 12,
    fabric: "85% cotton, 15% polyester French terry (loop back, smooth face).",
    careInstructions:
      "Machine wash cold, gentle cycle.\nTumble dry low.\nDo not bleach.\nSteam or cool iron.",
    colors: ["Heather grey", "Black", "Cream"],
  },
  {
    name: "Wool Gloves",
    description:
      "Soft wool-blend knit gloves with a snug ribbed cuff—warm for commuting and weekend walks.",
    price: 38,
    imageUrl: "/images/wool-gloves.jpg",
    category: "Gloves & Mittens",
    subcategory: "Gloves",
    stock: 24,
    fabric:
      "70% wool, 25% nylon, 5% elastane rib knit—durable with a little stretch.",
    careInstructions:
      "Hand wash cold with wool detergent.\nLay flat to dry; do not wring.\nDo not tumble dry.\nStore flat or folded—avoid hanging knits.",
    colors: ["Black", "Charcoal", "Cream"],
  },
  {
    name: "Fingerless Mittens",
    description:
      "Knit mittens with an open finger area so you can text, type, or grab keys without taking them off.",
    price: 34,
    imageUrl: "/images/fingerless-mittens.jpg",
    category: "Gloves & Mittens",
    subcategory: "Mittens",
    stock: 28,
    fabric:
      "45% wool, 50% acrylic, 5% elastane dense knit with a smooth, low-pill face.",
    careInstructions:
      "Hand wash cold with mild detergent.\nLay flat to dry; reshape while damp.\nDo not tumble dry.\nDo not bleach.",
    colors: ["Black", "Charcoal", "Rose"],
  },
  {
    name: "Plain Knit Scarf",
    description:
      "Simple stockinette knit in a neutral palette—soft, stretchy, and easy to style.",
    price: 32,
    imageUrl: "/images/plain-knit-scarf.jpg",
    category: "Scarves",
    subcategory: "Knit",
    stock: 22,
    fabric:
      "55% acrylic, 40% wool, 5% elastane mid-weight knit for warmth without bulk.",
    careInstructions:
      "Hand wash cold with mild detergent.\nLay flat to dry; reshape while damp.\nDo not tumble dry.\nStore folded.",
    colors: ["Ivory", "Blush", "Slate"],
  },
];

/** Removed from catalog; deleted from DB when they have no order lines. */
const RETIRED_PRODUCT_NAMES = [
  "Lavender Hoodie",
  "Classic Purple Tee",
  "Linen Shirt",
  "Merino Crewneck",
  "Tailored Shorts",
  "Straight Leg Pants",
  "Slim Jeans",
  "Classic Leather Gloves",
  "Winter Knit Mittens",
  "Canvas Tote",
  "Cashmere Blend Scarf",
];

async function main() {
  // Product sync is handled entirely by the per-product upsert loop below
  // (create if missing by name, update known fields if present — stock is
  // left alone). We never bulk-delete products here: this used to run a
  // wholesale `deleteMany({}) + createMany` "full reseed" whenever the
  // catalog looked stale (missing subcategory, legacy category names,
  // etc.), which silently destroyed any product added through the admin
  // panel that wasn't in this file's hardcoded list.

  const demoEmail = "demo@example.com";
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!existing) {
    const hashedPassword = await bcrypt.hash("demo123", 10);
    await prisma.user.create({
      data: {
        name: "Demo Customer",
        email: demoEmail,
        password: hashedPassword,
        role: "customer",
      },
    });
    console.log(`Seeded demo user: ${demoEmail} / demo123`);
  } else {
    console.log("Demo user already present, skipping user seed.");
  }

  const adminEmail = "admin123@gmail.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin23", 10);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      },
    });
    console.log(`Seeded admin user: ${adminEmail}`);
  } else if (existingAdmin.role !== "admin") {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "admin" },
    });
    console.log(`Updated ${adminEmail} to admin role.`);
  } else {
    console.log("Admin user already present, skipping admin seed.");
  }

  await prisma.product.updateMany({
    where: { name: "Oversized Hoodie" },
    data: { name: "Essential Hoodie" },
  });

  await prisma.product.updateMany({
    where: { name: "Canvas Tote" },
    data: { name: "Tote Bag" },
  });

  await prisma.product.updateMany({
    where: { name: "Cashmere Blend Scarf" },
    data: { name: "Plain Knit Scarf" },
  });

  for (const p of products) {
    const row = productRowForDb(p);
    // Note: stock is intentionally not synced here — it's admin-managed
    // (via inventory rows) and shouldn't be reset to the seed default
    // every time the app starts. It's only set below when a product is
    // first created.
    const updated = await prisma.product.updateMany({
      where: { name: p.name },
      data: {
        imageUrl: row.imageUrl,
        description: row.description,
        price: row.price,
        category: row.category,
        subcategory: row.subcategory ?? null,
        fabric: row.fabric ?? null,
        careInstructions: row.careInstructions ?? null,
        colors: row.colors ?? null,
      },
    });
    if (updated.count === 0) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          category: p.category,
          subcategory: p.subcategory ?? null,
          stock: p.stock,
          fabric: p.fabric ?? null,
          careInstructions: p.careInstructions ?? null,
          colors: row.colors ?? null,
        },
      });
    }
  }

  await prisma.product.deleteMany({
    where: {
      name: { in: RETIRED_PRODUCT_NAMES },
      orderItems: { none: {} },
    },
  });
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
