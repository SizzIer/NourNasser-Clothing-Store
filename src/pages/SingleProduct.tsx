import { Button, Dropdown, ProductItem } from "../components";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { addProductToTheCart } from "../features/cart/cartSlice";
import { useAppDispatch } from "../hooks";
import { formatCategorySlug } from "../utils/formatCategoryName";
import { slugify } from "../utils/slugify";
import toast from "react-hot-toast";

const PDP_SIZES = [
  { id: "xs", label: "XS" },
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
] as const;

const optionPillBase =
  "min-h-[42px] min-w-[44px] rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondaryBrown focus-visible:ring-offset-2";

const optionPillInactive =
  "border-black/15 bg-white text-black/80 hover:border-black/35 hover:bg-black/[0.02]";

const optionPillActive =
  "border-secondaryBrown bg-secondaryBrown text-white shadow-sm";

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

  const availableColors = useMemo(
    () => singleProduct?.colors?.filter(Boolean) ?? [],
    [singleProduct?.colors]
  );

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
  }, [singleProduct?.id]);

  const productCategoryKey = (p: Product | null) =>
    p ? p.categorySlug ?? slugify(p.category) : "";

  const handleAddToCart = () => {
    if (singleProduct) {
      const colors = singleProduct.colors?.filter(Boolean) ?? [];
      const hasColors = colors.length > 0;
      const colorLabel = hasColors
        ? colors.find((c) => slugify(c) === colorSlug) ?? colors[0]
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
          <img
            src={`/assets/${singleProduct?.image}`}
            alt={singleProduct?.title}
          />
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
            <div>
              <p className="text-sm mb-2.5 text-black/70" id="pdp-size-label">
                Size
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby="pdp-size-label"
              >
                {PDP_SIZES.map(({ id, label }) => {
                  const selected = size === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSize(id)}
                      className={`${optionPillBase} ${
                        selected ? optionPillActive : optionPillInactive
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {singleProduct?.colors && singleProduct.colors.length > 0 ? (
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
                  {singleProduct.colors.map((c) => {
                    const sid = slugify(c);
                    const selected = colorSlug === sid;
                    return (
                      <button
                        key={`${sid}-${c}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setColorSlug(sid)}
                        className={`${optionPillBase} ${
                          selected ? optionPillActive : optionPillInactive
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Button mode="brown" text="Add to cart" onClick={handleAddToCart} />
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
              In stock: {singleProduct?.stock}
              <br />
              Price: ${singleProduct?.price}
              <br />
              Selected size: {size.toUpperCase()}
              <br />
              {singleProduct?.colors && singleProduct.colors.length > 0 ? (
                <>
                  Selected color:{" "}
                  {singleProduct.colors.find(
                    (c) => slugify(c) === colorSlug
                  ) ?? singleProduct.colors[0]}
                </>
              ) : null}
            </Dropdown>

            {(singleProduct?.composition?.length ||
              singleProduct?.fabric ||
              singleProduct?.careInstructions) && (
              <Dropdown
                dropdownTitle="Fabric & care"
                accordionId="fabric"
                {...accordionProps}
              >
                {singleProduct.fabric ? (
                  <p className="text-sm text-black/80 leading-relaxed mb-4">
                    {singleProduct.fabric}
                  </p>
                ) : null}
                {singleProduct.composition &&
                singleProduct.composition.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-2">
                      Composition
                    </p>
                    <ul className="list-none space-y-1.5 text-sm mb-4">
                      {singleProduct.composition.map((row, i) => (
                        <li
                          key={`${row.fiber}-${i}`}
                          className="flex justify-between gap-4 border-b border-black/5 pb-1.5 last:border-0"
                        >
                          <span className="text-black/80">{row.fiber}</span>
                          <span className="font-medium tabular-nums shrink-0">
                            {row.percent}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : !singleProduct.fabric ? (
                  <p className="text-sm text-black/60 mb-4">
                    Composition for this item will be listed here.
                  </p>
                ) : null}
                {singleProduct.careInstructions ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-2">
                      Care
                    </p>
                    <p className="text-sm text-black/80 leading-relaxed whitespace-pre-line">
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