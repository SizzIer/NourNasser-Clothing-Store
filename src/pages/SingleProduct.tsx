import {
  Button,
  Dropdown,
  ProductItem,
} from "../components";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { addProductToTheCart } from "../features/cart/cartSlice";
import { useAppDispatch } from "../hooks";
import { formatCategoryName } from "../utils/formatCategoryName";
import toast from "react-hot-toast";

const SingleProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [singleProduct, setSingleProduct] = useState<Product | null>(null);
  const params = useParams<{ id: string }>();
  const dispatch = useAppDispatch();

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

  const handleAddToCart = () => {
    if (singleProduct) {
      dispatch(
        addProductToTheCart({
          id: String(singleProduct.id),
          image: singleProduct.image,
          title: singleProduct.title,
          category: singleProduct.category,
          price: singleProduct.price,
          quantity: 1,
          size: "default",
          color: "default",
          popularity: singleProduct.popularity,
          stock: singleProduct.stock,
        })
      );
      toast.success("Product added to the cart");
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
                {formatCategoryName(singleProduct?.category || "")}
              </p>
              <p className="text-base font-bold">${singleProduct?.price}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button mode="brown" text="Add to cart" onClick={handleAddToCart} />
            <p className="text-secondaryBrown text-sm text-right">
              Delivery estimated on the Friday, July 26
            </p>
          </div>

          <div>
            <Dropdown dropdownTitle="Description">
              This is a stylish product from the Nour Nasser collection.
            </Dropdown>

            <Dropdown dropdownTitle="Product Details">
              Category: {formatCategoryName(singleProduct?.category || "")}
              <br />
              In stock: {singleProduct?.stock}
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
        <div className="flex flex-wrap justify-between items-center gap-y-8 mt-12 max-xl:justify-start max-xl:gap-5 ">
          {products
            .filter((product: Product) => product.id !== singleProduct?.id)
            .slice(0, 3)
            .map((product: Product) => (
              <ProductItem
                key={product.id}
                id={product.id}
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