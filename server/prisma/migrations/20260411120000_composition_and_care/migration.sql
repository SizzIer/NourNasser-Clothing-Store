-- AlterTable
ALTER TABLE "Product" ADD COLUMN "composition" TEXT;
ALTER TABLE "Product" ADD COLUMN "careInstructions" TEXT;

-- Preserve legacy copy as care text before dropping column
UPDATE "Product" SET "careInstructions" = "fabricDetails" WHERE "fabricDetails" IS NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "fabricDetails";
