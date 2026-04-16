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
    composition:
      p.composition != null ? JSON.stringify(p.composition) : null,
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
      "Combed cotton poplin, plain weave—light, crisp, and breathable.",
    composition: [{ fiber: "Cotton", percent: 100 }],
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
    fabric: "Ring-spun combed cotton jersey.",
    composition: [{ fiber: "Cotton", percent: 100 }],
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
    fabric: "Soft cotton twill with a touch of stretch for ease when you sit and move.",
    composition: [
      { fiber: "Cotton", percent: 97 },
      { fiber: "Elastane", percent: 3 },
    ],
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
    fabric: "Mid-weight cotton–poly fleece with a smooth outside and soft brushed interior.",
    composition: [
      { fiber: "Cotton", percent: 80 },
      { fiber: "Polyester", percent: 20 },
    ],
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
    fabric: "Brushed-back cotton–poly fleece.",
    composition: [
      { fiber: "Cotton", percent: 80 },
      { fiber: "Polyester", percent: 20 },
    ],
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
    fabric: "Lightweight merino wool in a plain weave.",
    composition: [{ fiber: "Merino wool", percent: 100 }],
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
    fabric: "Full-grain cowhide strap with a brushed zinc-alloy buckle.",
    composition: [{ fiber: "Cowhide leather (strap)", percent: 100 }],
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
    fabric: "Heavy plain-weave cotton canvas.",
    composition: [{ fiber: "Cotton", percent: 100 }],
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
    fabric: "Cotton–poly French terry (loop back, smooth face).",
    composition: [
      { fiber: "Cotton", percent: 85 },
      { fiber: "Polyester", percent: 15 },
    ],
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
    fabric: "Wool-rich rib knit with nylon for durability and a little stretch.",
    composition: [
      { fiber: "Wool", percent: 70 },
      { fiber: "Nylon", percent: 25 },
      { fiber: "Elastane", percent: 5 },
    ],
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
    fabric: "Dense wool–acrylic knit with a smooth, low-pill face.",
    composition: [
      { fiber: "Wool", percent: 45 },
      { fiber: "Acrylic", percent: 50 },
      { fiber: "Elastane", percent: 5 },
    ],
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
    fabric: "Mid-weight acrylic–wool blend knit for warmth without bulk.",
    composition: [
      { fiber: "Acrylic", percent: 55 },
      { fiber: "Wool", percent: 40 },
      { fiber: "Elastane", percent: 5 },
    ],
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
    await prisma.product.createMany({
      data: products.map(productRowForDb),
    });
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
    const updated = await prisma.product.updateMany({
      where: { name: p.name },
      data: {
        imageUrl: row.imageUrl,
        description: row.description,
        price: row.price,
        stock: row.stock,
        category: row.category,
        subcategory: row.subcategory ?? null,
        fabric: row.fabric ?? null,
        composition: row.composition ?? null,
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
          composition: row.composition ?? null,
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
