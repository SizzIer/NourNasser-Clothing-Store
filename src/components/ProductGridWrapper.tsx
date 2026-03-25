import React, { ReactElement, useCallback, useEffect, useState } from "react";
import customFetch from "../axios/custom";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  setShowingProducts,
  setTotalProducts,
} from "../features/shop/shopSlice";
import { slugify } from "../utils/slugify";

const ProductGridWrapper = ({
  searchQuery,
  sortCriteria,
  category,
  subcategory,
  page,
  limit,
  children,
}: {
  searchQuery?: string;
  sortCriteria?: string;
  category?: string;
  subcategory?: string;
  page?: number;
  limit?: number;
  children:
    | ReactElement<{ products: Product[] }>
    | ReactElement<{ products: Product[] }>[];
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const { totalProducts } = useAppSelector((state) => state.shop);
  const dispatch = useAppDispatch();

  // Memoize the function to prevent unnecessary re-renders
  // getSearchedProducts will be called only when searchQuery or sortCriteria changes
  const getSearchedProducts = useCallback(
    async (query: string, sort: string, page: number) => {
      if (!query || query.length === 0) {
        query = "";
      }
      const response = await customFetch("/products");
      const allProducts = await response.data;
      let searchedProducts = allProducts.filter((product: Product) =>
        product.title.toLowerCase().includes(query.toLowerCase())
      );

      if (category) {
        const want = slugify(category);
        searchedProducts = searchedProducts.filter((product: Product) => {
          const slug = product.categorySlug ?? slugify(product.category);
          return slug === want;
        });
      }

      if (subcategory) {
        const sub = subcategory.toLowerCase();
        searchedProducts = searchedProducts.filter((product: Product) => {
          return (product.subcategory || "").toLowerCase() === sub;
        });
      }

      if (totalProducts !== searchedProducts.length) {
        dispatch(setTotalProducts(searchedProducts.length));
      }

      // Sort the products based on the sortCriteria
      if (sort === "price-asc") {
        searchedProducts = searchedProducts.sort(
          (a: Product, b: Product) => a.price - b.price
        );
      } else if (sort === "price-desc") {
        searchedProducts = searchedProducts.sort(
          (a: Product, b: Product) => b.price - a.price
        );
      } else if (sort === "popularity") {
        searchedProducts = searchedProducts.sort(
          (a: Product, b: Product) => b.popularity - a.popularity
        );
      }
      // Limit the number of products to be displayed
      if (limit) {
        setProducts(searchedProducts.slice(0, limit));
        // Set the number of products being displayed
        // This will be displayed in the ShowingPagination component
        dispatch(setShowingProducts(searchedProducts.slice(0, limit).length));
        // If page is provided, slice the products based on the page number
        // this will be used for pagination
      } else if (page) {
        setProducts(searchedProducts.slice(0, page * 9));
        // Set the number of products being displayed
        // This will be displayed in the ShowingPagination component
        dispatch(
          setShowingProducts(searchedProducts.slice(0, page * 9).length)
        );
        // If no limit or page is provided, display all the products
      } else {
        setProducts(searchedProducts);
        // Set the number of products being displayed
        dispatch(setShowingProducts(searchedProducts.length));
      }
    },
    [category, subcategory, limit]
  );

  useEffect(() => {
    getSearchedProducts(searchQuery || "", sortCriteria || "", page || 1);
  }, [searchQuery, sortCriteria, page, category, subcategory, getSearchedProducts]);

  // Clone the children and pass the products as props to the children
  // This will cause the children to re-render with the new products
  // Also it will cause many re-renders if the children are not memoized
  // So I memoized the ProductGrid component
  const childrenWithProps = React.Children.map(children, (child) => {
    // Checking isValidElement is the safe way and avoids a
    // typescript error too.
    if (React.isValidElement(child) && products.length > 0) {
      return React.cloneElement(child, { products: products });
    }
    return null;
  });

  return childrenWithProps;
};
export default ProductGridWrapper;
