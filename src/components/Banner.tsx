import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import customFetch from "../axios/custom";

type FeaturedCollection = {
  slug: string;
  products?: unknown[];
};

const Banner = () => {
  const [featuredSlug, setFeaturedSlug] = useState<string | null>(null);

  useEffect(() => {
    customFetch
      .get<FeaturedCollection | null>("/collections/featured")
      .then((res) => {
        const data = res.data;
        // Match home grid: only deep-link when the featured drop has products.
        if (data?.slug && Array.isArray(data.products) && data.products.length > 0) {
          setFeaturedSlug(data.slug);
        } else {
          setFeaturedSlug(null);
        }
      })
      .catch(() => setFeaturedSlug(null));
  }, []);

  const collectionHref = featuredSlug
    ? `/collection/${featuredSlug}`
    : "#our-collection";

  return (
    <div className="banner w-full flex flex-col justify-end items-center max-sm:h-[550px] max-sm:gap-2">
      <h2 className="text-white text-center text-6xl font-bold tracking-[1.86px] leading-[60px] max-sm:text-4xl max-[400px]:text-3xl">
        <br />
      </h2>
      <h3 className="text-white text-3xl font-normal leading-[72px] tracking-[0.9px] max-sm:text-xl max-[400px]:text-lg">
        New collection
      </h3>
      <div className="flex justify-center items-center gap-3 pb-10 max-[400px]:flex-col max-[400px]:gap-1 w-[420px] max-sm:w-[350px] max-[400px]:w-[300px]">
        <Link
          to="/shop"
          className="bg-white text-black text-center text-xl border border-[rgba(0, 0, 0, 0.40)] font-normal tracking-[0.6px] leading-[72px] w-full h-12 flex items-center justify-center"
        >
          Shop Now
        </Link>
        <Link
          to={collectionHref}
          className="text-white border-white border-2 text-center text-xl font-normal tracking-[0.6px] leading-[72px] w-full h-12 flex items-center justify-center"
        >
          See Collection
        </Link>
      </div>
    </div>
  );
};
export default Banner;
