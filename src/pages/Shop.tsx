import {
  useLoaderData,
  useSearchParams,
} from "react-router-dom";
import { ShopBanner, ShopPageContent } from "../components";
import { useResetPaginationOnReload } from "../hooks";

function pageFromSearchParams(searchParams: URLSearchParams) {
  const raw = searchParams.get("page");
  const n = parseInt(raw || "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const Shop = () => {
  const { category, subcategory } = useLoaderData() as {
    category: string;
    subcategory?: string;
  };
  const [searchParams] = useSearchParams();
  useResetPaginationOnReload();
  return (
    <div className="max-w-screen-2xl mx-auto w-full px-5 max-[400px]:px-3 pt-10">
      <ShopBanner category={category} />
      <ShopPageContent
        category={category}
        subcategory={subcategory}
        page={pageFromSearchParams(searchParams)}
      />
    </div>
  );
};
export default Shop;
