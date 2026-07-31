import { Button, Dropdown, ProductItem } from "../components";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { addProductToTheCart } from "../features/cart/cartSlice";
import { useAppDispatch } from "../hooks";
import { formatCategorySlug } from "../utils/formatCategoryName";
import { slugify } from "../utils/slugify";
import toast from "react-hot-toast";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function resolveImage(image: string | undefined | null): string {
  if (!image) return "";
  if (image.startsWith("/") || image.startsWith("http")) return image;
  return `/assets/${image}`;
}

const optionPillBase =
  "min-h-[42px] min-w-[44px] rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondaryBrown focus-visible:ring-offset-2";

const optionPillInactive =
  "border-black/15 bg-white text-black/80 hover:border-black/35 hover:bg-black/[0.02]";

const optionPillActive =
  "border-secondaryBrown bg-secondaryBrown text-white shadow-sm";

const optionPillDisabled =
  "border-black/10 bg-white text-black/25 line-through cursor-not-allowed";

/** n full business days after `from` (Mon–Fri only; skips weekends). */
function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  let remaining = n;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return d;
}

function formatDeliveryDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatDeliveryRange(start: Date, end: Date): string {
  return `${formatDeliveryDate(start)} – ${formatDeliveryDate(end)}`;
}

const SingleProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [singleProduct, setSingleProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<string>("xs");
  const [colorSlug, setColorSlug] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const params = useParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const accordionProps = {
    accordionOpen: openAccordion,
    onAccordionChange: setOpenAccordion,
  } as const;

  const deliveryEstimate = useMemo(() => {
    const today = new Date();
    const start = addBusinessDays(today, 5);
    const end = addBusinessDays(today, 10);
    return formatDeliveryRange(start, end);
  }, []);

  // ── Inventory derived data ──────────────────────────────────
  const inventoryRows = singleProduct?.inventory ?? null;
  const hasInventory = Array.isArray(inventoryRows) && inventoryRows.length > 0;

  // Distinct sizes from inventory (in insertion order)
  const inventorySizes = useMemo<string[] | null>(() => {
    if (!hasInventory) return null;
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

  // Distinct colors from inventory (in insertion order)
  const inventoryAllColors = useMemo<string[] | null>(() => {
    if (!hasInventory) return null;
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

  // Colors are only shown for products tracked by size & color inventory.
  const availableColors = useMemo(
    () => (hasInventory ? inventoryAllColors ?? [] : []),
    [hasInventory, inventoryAllColors]
  );

  const gallery = useMemo<string[]>(() => {
    const imgs = singleProduct?.images;
    if (Array.isArray(imgs) && imgs.length > 0) return imgs;
    return singleProduct?.image ? [singleProduct.image] : [];
  }, [singleProduct?.images, singleProduct?.image]);

  // Stock count for the currently selected size + color (null = combo not in inventory)
  const selectedInventoryStock = useMemo<number | null>(() => {
    if (!hasInventory) return null;
    const row = inventoryRows!.find(
      (r) =>
        r.size.toLowerCase() === size.toLowerCase() &&
        slugify(r.color) === colorSlug
    );
    return row ? row.stock : null;
  }, [inventoryRows, hasInventory, size, colorSlug]);

  useEffect(() => {
    const baseId = params.id?.split("-")[0] ?? "";

    const fetchSingleProduct = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/products");
        const data = await response.json();
        const foundProduct = data.find(
          (product: Product) => String(product.id) === String(baseId)
        );
        setSingleProduct(foundProduct || null);
      } catch (error) {
        console.error("Failed to fetch single product:", error);
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/products");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };

    fetchSingleProduct();
    fetchProducts();
  }, [params.id]);

  useEffect(() => {
    if (availableColors.length > 0) {
      setColorSlug(slugify(availableColors[0]));
    } else {
      setColorSlug("");
    }
  }, [singleProduct?.id, availableColors]);

  useEffect(() => {
    setOpenAccordion(null);
    setActiveIndex(0);
    // Reset size: use first inventory size if available, otherwise fall back to "xs"
    const inv = singleProduct?.inventory;
    if (Array.isArray(inv) && inv.length > 0 && inv[0].size) {
      setSize(inv[0].size);
    } else {
      setSize("xs");
    }
  }, [singleProduct?.id]);

  // Whenever the selected color changes, make sure the selected size is
  // actually in stock for that color — sizes vary per color (e.g. black
  // only comes in L while green comes in S–XL), so a size picked for one
  // color can be invalid for another.
  useEffect(() => {
    if (!hasInventory || !colorSlug) return;
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
  }, [colorSlug, hasInventory, inventoryRows]);

  const productCategoryKey = (p: Product | null) =>
    p ? p.categorySlug ?? slugify(p.category) : "";

  const noInventoryOutOfStock =
    !hasInventory && !!singleProduct && singleProduct.stock <= 0;

  const handleAddToCart = () => {
    if (hasInventory && selectedInventoryStock !== null && selectedInventoryStock <= 0) {
      toast.error("That size and color combination is out of stock");
      return;
    }
    if (noInventoryOutOfStock) {
      toast.error("Out of stock");
      return;
    }
    if (singleProduct) {
      const hasColors = availableColors.length > 0;
      const colorLabel = hasColors
        ? availableColors.find((c) => slugify(c) === colorSlug) ?? availableColors[0]
        : "";
      const colorSuffix =
        hasColors && colorLabel ? `-${slugify(colorLabel)}` : "";
      dispatch(
        addProductToTheCart({
          id: `${singleProduct.id}-${size}${colorSuffix}`,
          image: singleProduct.image,
          title: singleProduct.title,
          category: singleProduct.category,
          price: singleProduct.price,
          quantity: 1,
          size,
          color: colorLabel,
          popularity: singleProduct.popularity,
          stock: singleProduct.stock,
          description: singleProduct.description,
        })
      );
      toast.success(
        hasColors && colorLabel
          ? `Added ${colorLabel}, size ${size.toUpperCase()}, to cart`
          : `Added size ${size.toUpperCase()} to cart`
      );
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-5 max-[400px]:px-3">
      <div className="grid grid-cols-3 gap-x-8 max-lg:grid-cols-1">
        <div className="lg:col-span-2">
          {/* Main image with prev/next arrows */}
          <div className="relative w-full select-none">
            <img
              src={resolveImage(gallery[activeIndex])}
              alt={singleProduct?.title}
              className="w-full object-cover"
            />
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                  aria-label="Previous image"
                >
                  <FiChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                  aria-label="Next image"
                >
                  <FiChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`shrink-0 w-20 h-24 overflow-hidden rounded border-2 transition-colors ${
                    i === activeIndex
                      ? "border-secondaryBrown"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={resolveImage(img)}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-5 mt-9">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl">{singleProduct?.title}</h1>
            <div className="flex justify-between items-center">
              <p className="text-base text-secondaryBrown">
                {singleProduct
                  ? formatCategorySlug(productCategoryKey(singleProduct))
                  : ""}
              </p>
              <p className="text-base font-bold">${singleProduct?.price}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {hasInventory && inventorySizes && inventorySizes.length > 0 ? (
              <div>
                <p className="text-sm mb-2.5 text-black/70" id="pdp-size-label">
                  Size
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-labelledby="pdp-size-label"
                >
                  {inventorySizes.map((sizeLabel) => {
                    const sizeKey = sizeLabel;
                    const selected = size.toLowerCase() === sizeKey.toLowerCase();
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
                        onClick={() => setSize(sizeKey)}
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
                  className="text-sm mb-2.5 text-black/70"
                  id="pdp-color-label"
                >
                  Color
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-labelledby="pdp-color-label"
                >
                  {availableColors.map((c) => {
                    const sid = slugify(c);
                    const selected = colorSlug === sid;
                    const stockForCombo = hasInventory
                      ? (inventoryRows!
                          .filter(
                            (r) =>
                              r.size.toLowerCase() === size.toLowerCase() &&
                              r.color === c
                          )
                          .reduce((s, r) => s + r.stock, 0))
                      : null;
                    // Only strike the color through when it's out of stock in
                    // every size, not just the currently selected size.
                    const colorTotalStock = hasInventory
                      ? inventoryRows!
                          .filter((r) => r.color === c)
                          .reduce((s, r) => s + r.stock, 0)
                      : null;
                    const oos = colorTotalStock !== null && colorTotalStock === 0;
                    return (
                      <button
                        key={`${sid}-${c}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setColorSlug(sid)}
                        className={`${optionPillBase} ${
                          oos
                            ? optionPillDisabled
                            : selected
                            ? optionPillActive
                            : optionPillInactive
                        }`}
                        title={
                          oos
                            ? "Out of stock"
                            : stockForCombo !== null
                            ? `${stockForCombo} in stock for this size`
                            : undefined
                        }
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Button
              mode="brown"
              text={
                noInventoryOutOfStock ||
                (hasInventory && selectedInventoryStock === 0)
                  ? "Out of stock"
                  : "Add to cart"
              }
              onClick={handleAddToCart}
              disabled={
                noInventoryOutOfStock ||
                (hasInventory && selectedInventoryStock === 0)
              }
              style={
                noInventoryOutOfStock ||
                (hasInventory && selectedInventoryStock === 0)
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            />

            {/* Stock indicator (only for products tracked by size & color) */}
            {hasInventory && selectedInventoryStock !== null ? (
              selectedInventoryStock > 0 ? (
                <p className="text-sm text-green-700 font-medium">
                  {selectedInventoryStock} in stock for this size &amp; color
                </p>
              ) : (
                <p className="text-sm text-red-500 font-medium">
                  Out of stock for this size &amp; color
                </p>
              )
            ) : null}

            <p className="text-secondaryBrown text-sm text-right leading-snug">
              <span className="text-black/60">Estimated delivery: </span>
              {deliveryEstimate}
            </p>
          </div>

          <div>
            <Dropdown
              dropdownTitle="Description"
              accordionId="description"
              {...accordionProps}
            >
              {singleProduct?.description || "No description available."}
            </Dropdown>

            <Dropdown
              dropdownTitle="Product Details"
              accordionId="details"
              {...accordionProps}
            >
              Category:{" "}
              {singleProduct
                ? formatCategorySlug(productCategoryKey(singleProduct))
                : ""}
              <br />
              Price: ${singleProduct?.price}
            </Dropdown>

            {(singleProduct?.fabric || singleProduct?.careInstructions) && (
              <Dropdown
                dropdownTitle="Fabric & care"
                accordionId="fabric"
                {...accordionProps}
              >
                {singleProduct.fabric ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-2">
                      Fabric
                    </p>
                    <p className="text-sm text-black/80 leading-relaxed mb-4 break-words">
                      {singleProduct.fabric}
                    </p>
                  </>
                ) : null}
                {singleProduct.careInstructions ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-2">
                      Care Instructions
                    </p>
                    <p className="text-sm text-black/80 leading-relaxed whitespace-pre-line break-words">
                      {singleProduct.careInstructions}
                    </p>
                  </>
                ) : null}
              </Dropdown>
            )}

            <Dropdown
              dropdownTitle="Delivery Details"
              accordionId="delivery"
              {...accordionProps}
            >
              Standard delivery. Orders are processed in 1–3 business days, then
              shipped. Typical arrival window: {deliveryEstimate}.
            </Dropdown>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-black/90 text-5xl mt-24 mb-12 text-center max-lg:text-4xl">
          Similar Products
        </h2>
        <div className="mt-12 grid w-full grid-cols-1 justify-items-center gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products
            .filter(
              (product: Product) =>
                product.id !== singleProduct?.id &&
                productCategoryKey(product) ===
                  productCategoryKey(singleProduct)
            )
            .slice(0, 3)
            .map((product: Product) => (
              <ProductItem
                key={product.id}
                id={String(product.id)}
                image={product.image}
                title={product.title}
                category={product.category}
                price={product.price}
                popularity={product.popularity}
                stock={product.stock}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SingleProduct;