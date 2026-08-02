import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { addProductToTheCart } from "../features/cart/cartSlice";
import { useAppDispatch } from "../hooks";
import { slugify } from "../utils/slugify";
import Button from "./Button";

const optionPillBase =
  "min-h-[42px] min-w-[44px] rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondaryBrown focus-visible:ring-offset-2";

const optionPillInactive =
  "border-black/15 bg-white text-black/80 hover:border-black/35 hover:bg-black/[0.02]";

const optionPillActive =
  "border-secondaryBrown bg-secondaryBrown text-white shadow-sm";

const optionPillDisabled =
  "border-black/10 bg-white text-black/25 line-through cursor-not-allowed";

type InventoryRow = { size: string; color: string; stock: number };

type QuickAddToCartModalProps = {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    image: string;
    category: string;
    price: number;
    popularity: number;
    stock: number;
    description?: string;
    inventory?: InventoryRow[] | null;
  };
};

const QuickAddToCartModal = ({
  open,
  onClose,
  product,
}: QuickAddToCartModalProps) => {
  const dispatch = useAppDispatch();
  const inventoryRows = product.inventory ?? null;
  const hasInventory = Array.isArray(inventoryRows) && inventoryRows.length > 0;

  const inventorySizes = useMemo(() => {
    if (!hasInventory) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const row of inventoryRows!) {
      if (row.size && !seen.has(row.size)) {
        seen.add(row.size);
        result.push(row.size);
      }
    }
    return result;
  }, [inventoryRows, hasInventory]);

  const availableColors = useMemo(() => {
    if (!hasInventory) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const row of inventoryRows!) {
      if (row.color && !seen.has(row.color)) {
        seen.add(row.color);
        result.push(row.color);
      }
    }
    return result;
  }, [inventoryRows, hasInventory]);

  const [size, setSize] = useState("xs");
  const [colorSlug, setColorSlug] = useState("");

  useEffect(() => {
    if (!open) return;
    if (hasInventory && inventorySizes[0]) {
      setSize(inventorySizes[0]);
    } else {
      setSize("xs");
    }
    if (availableColors[0]) {
      setColorSlug(slugify(availableColors[0]));
    } else {
      setColorSlug("");
    }
  }, [open, product.id, hasInventory, inventorySizes, availableColors]);

  useEffect(() => {
    if (!open || !hasInventory || !colorSlug) return;
    const rowsForColor = inventoryRows!.filter(
      (r) => slugify(r.color) === colorSlug
    );
    const currentValid = rowsForColor.some(
      (r) => r.size.toLowerCase() === size.toLowerCase() && r.stock > 0
    );
    if (!currentValid) {
      const firstInStock = rowsForColor.find((r) => r.stock > 0);
      if (firstInStock) setSize(firstInStock.size);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorSlug, hasInventory, inventoryRows, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const selectedInventoryStock = useMemo(() => {
    if (!hasInventory) return null;
    const row = inventoryRows!.find(
      (r) =>
        r.size.toLowerCase() === size.toLowerCase() &&
        slugify(r.color) === colorSlug
    );
    return row ? row.stock : null;
  }, [inventoryRows, hasInventory, size, colorSlug]);

  const noInventoryOutOfStock = !hasInventory && product.stock <= 0;
  const comboOutOfStock =
    hasInventory &&
    selectedInventoryStock !== null &&
    selectedInventoryStock <= 0;
  const addDisabled = noInventoryOutOfStock || comboOutOfStock;

  const handleAddToCart = () => {
    if (comboOutOfStock) {
      toast.error("That size and color combination is out of stock");
      return;
    }
    if (noInventoryOutOfStock) {
      toast.error("Out of stock");
      return;
    }

    const hasColors = availableColors.length > 0;
    const colorLabel = hasColors
      ? availableColors.find((c) => slugify(c) === colorSlug) ??
        availableColors[0]
      : "";
    const colorSuffix =
      hasColors && colorLabel ? `-${slugify(colorLabel)}` : "";

    dispatch(
      addProductToTheCart({
        id: `${product.id}-${size}${colorSuffix}`,
        image: product.image,
        title: product.title,
        category: product.category,
        price: product.price,
        quantity: 1,
        size,
        color: colorLabel,
        popularity: product.popularity,
        stock: product.stock,
        description: product.description,
      })
    );
    toast.success(
      hasColors && colorLabel
        ? `Added ${colorLabel}, size ${size.toUpperCase()}, to cart`
        : `Added size ${size.toUpperCase()} to cart`
    );
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`quick-add-title-${product.id}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id={`quick-add-title-${product.id}`}
              className="text-2xl tracking-wide text-black"
            >
              {product.title}
            </h2>
            <p className="mt-1 text-base font-bold">${product.price}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-black/50 transition-colors hover:text-black"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {hasInventory && inventorySizes.length > 0 ? (
            <div>
              <p
                className="mb-2.5 text-sm text-black/70"
                id={`quick-add-size-${product.id}`}
              >
                Size
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby={`quick-add-size-${product.id}`}
              >
                {inventorySizes.map((sizeLabel) => {
                  const selected =
                    size.toLowerCase() === sizeLabel.toLowerCase();
                  const totalForSize = inventoryRows!
                    .filter(
                      (r) =>
                        r.size.toLowerCase() === sizeLabel.toLowerCase() &&
                        (!colorSlug || slugify(r.color) === colorSlug)
                    )
                    .reduce((s, r) => s + r.stock, 0);
                  const oos = totalForSize === 0;
                  return (
                    <button
                      key={sizeLabel}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={oos}
                      onClick={() => setSize(sizeLabel)}
                      className={`${optionPillBase} ${
                        oos
                          ? optionPillDisabled
                          : selected
                            ? optionPillActive
                            : optionPillInactive
                      }`}
                      title={oos ? "Out of stock" : undefined}
                    >
                      {sizeLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {availableColors.length > 0 ? (
            <div>
              <p
                className="mb-2.5 text-sm text-black/70"
                id={`quick-add-color-${product.id}`}
              >
                Color
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby={`quick-add-color-${product.id}`}
              >
                {availableColors.map((c) => {
                  const sid = slugify(c);
                  const selected = colorSlug === sid;
                  const colorTotalStock = inventoryRows!
                    .filter((r) => r.color === c)
                    .reduce((s, r) => s + r.stock, 0);
                  const oos = colorTotalStock === 0;
                  return (
                    <button
                      key={`${sid}-${c}`}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={oos}
                      onClick={() => setColorSlug(sid)}
                      className={`${optionPillBase} ${
                        oos
                          ? optionPillDisabled
                          : selected
                            ? optionPillActive
                            : optionPillInactive
                      }`}
                      title={oos ? "Out of stock" : undefined}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {hasInventory && selectedInventoryStock !== null ? (
            selectedInventoryStock > 0 ? (
              <p className="text-sm font-medium text-green-700">
                {selectedInventoryStock} in stock for this size &amp; color
              </p>
            ) : (
              <p className="text-sm font-medium text-red-500">
                Out of stock for this size &amp; color
              </p>
            )
          ) : null}

          <Button
            mode="brown"
            text={addDisabled ? "Out of stock" : "Add to cart"}
            onClick={handleAddToCart}
            disabled={addDisabled}
            style={
              addDisabled
                ? { opacity: 0.5, cursor: "not-allowed" }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
};

export default QuickAddToCartModal;
