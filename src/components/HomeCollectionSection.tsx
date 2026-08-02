import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import customFetch from "../axios/custom";
import ProductGrid from "./ProductGrid";
import ProductGridWrapper from "./ProductGridWrapper";
import ProductItem from "./ProductItem";

interface FeaturedCollection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  products: Product[];
}

const HomeCollectionSection = () => {
  const [featured, setFeatured] = useState<FeaturedCollection | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    customFetch
      .get<FeaturedCollection | null>("/collections/featured")
      .then((res) => setFeatured(res.data))
      .catch(() => setFeatured(null))
      .finally(() => setLoaded(true));
  }, []);

  const hasFeaturedProducts =
    !!featured && Array.isArray(featured.products) && featured.products.length > 0;

  return (
    <div
      id="our-collection"
      className="max-w-screen-2xl mx-auto w-full px-5 max-[400px]:px-3"
    >
      <div className="flex items-center justify-between mt-24 gap-4">
        <h2 className="text-black text-5xl font-normal tracking-[1.56px] max-sm:text-4xl">
          {hasFeaturedProducts ? featured!.name : "Our Collection"}
        </h2>
        {hasFeaturedProducts ? (
          <Link
            to={`/collection/${featured!.slug}`}
            className="text-secondaryBrown text-base tracking-wide shrink-0"
          >
            View all
          </Link>
        ) : null}
      </div>

      {!loaded ? (
        <p className="mt-12 text-black/40">Loading…</p>
      ) : hasFeaturedProducts ? (
        <div className="mt-12 grid w-full grid-cols-1 justify-items-center gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured!.products.slice(0, 6).map((product) => (
            <ProductItem
              key={product.id}
              id={String(product.id)}
              image={product.image}
              title={product.title}
              category={product.category}
              price={product.price}
              popularity={product.popularity}
              stock={product.stock}
              description={product.description}
              inventory={product.inventory}
            />
          ))}
        </div>
      ) : (
        <ProductGridWrapper limit={6}>
          <ProductGrid />
        </ProductGridWrapper>
      )}
    </div>
  );
};
export default HomeCollectionSection;
