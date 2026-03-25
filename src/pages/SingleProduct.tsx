import {
  Button,
  Dropdown,
  ProductItem,
  StandardSelectInput,
} from "../components";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { addProductToTheCart } from "../features/cart/cartSlice";
import { useAppDispatch } from "../hooks";
import { formatCategorySlug } from "../utils/formatCategoryName";
import { slugify } from "../utils/slugify";
import toast from "react-hot-toast";
import WithSelectInputWrapper from "../utils/withSelectInputWrapper";

const SingleProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [singleProduct, setSingleProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<string>("xs");
  const params = useParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const SelectInputUpgrade = WithSelectInputWrapper(StandardSelectInput);

  useEffect(() => {
    const fetchSingleProduct = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/products");
        const data = await response.json();
        const foundProduct = data.find(
          (product: Product) => String(product.id) === String(params.id)
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

  const productCategoryKey = (p: Product | null) =>
    p ? p.categorySlug ?? slugify(p.category) : "";

  const handleAddToCart = () => {
    if (singleProduct) {
      dispatch(
        addProductToTheCart({
          id: `${singleProduct.id}-${size}`,
          image: singleProduct.image,
          title: singleProduct.title,
          category: singleProduct.category,
          price: singleProduct.price,
          quantity: 1,
          size,
          color: "default",
          popularity: singleProduct.popularity,
          stock: singleProduct.stock,
          description: singleProduct.description,
        })
      );
      toast.success(`Added size ${size.toUpperCase()} to cart`);
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
              <p className="text-sm mb-2 text-black/70">Select size</p>
              <SelectInputUpgrade
                selectList={[
                  { id: "xs", value: "XS" },
                  { id: "s", value: "S" },
                  { id: "m", value: "M" },
                  { id: "l", value: "L" },
                  { id: "xl", value: "XL" },
                ]}
                value={size}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSize(e.target.value)
                }
              />
            </div>

            <Button mode="brown" text="Add to cart" onClick={handleAddToCart} />
            <p className="text-secondaryBrown text-sm text-right">
              Delivery estimated on the Friday, July 26
            </p>
          </div>

          <div>
            <Dropdown dropdownTitle="Description">
              {singleProduct?.description || "No description available."}
            </Dropdown>

            <Dropdown dropdownTitle="Product Details">
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
            </Dropdown>

            <Dropdown dropdownTitle="Delivery Details">
              Standard delivery available. Orders are processed in 1–3 business
              days.
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