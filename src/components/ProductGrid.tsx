import React from "react";
import ProductItem from "./ProductItem";

const ProductGrid = ({ products }: { products?: Product[] }) => {
  return (
    <div
      id="gridTop"
      className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center gap-x-8 gap-y-12 mt-12"
    >
      {products &&
        products.map((product: Product) => (
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
  );
};
// Memoize the component to prevent unnecessary re-renders because of React.cloneElement
export default React.memo(ProductGrid);
