import {
  Button,
  ProductGrid,
  ProductGridWrapper,
  ShowingSearchPagination,
} from "../components";
import { Form, useSearchParams } from "react-router-dom";
import { useResetPaginationOnReload } from "../hooks";

function pageFromSearchParams(searchParams: URLSearchParams) {
  const raw = searchParams.get("page");
  const n = parseInt(raw || "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const Search = () => {
  const [searchParams] = useSearchParams();
  useResetPaginationOnReload();
  const query = searchParams.get("query") || "";
  const page = pageFromSearchParams(searchParams);

  return (
    <div className="max-w-screen-2xl mx-auto w-full px-5 max-[400px]:px-3">
      <Form
        method="post"
        className="flex items-center mt-24"
      >
        <input
          type="text"
          placeholder="Search products"
          className="border border-gray-300 focus:border-gray-400 h-12 text-xl px-3 w-full outline-none max-sm:text-lg"
          name="searchInput"
        />
        <div className="w-52 max-sm:w-40">
          <Button mode="brown" text="Search" type="submit" />
        </div>
      </Form>

      <ProductGridWrapper searchQuery={query} page={page}>
        <ProductGrid />
      </ProductGridWrapper>

      <ShowingSearchPagination page={page} />
    </div>
  );
};
export default Search;
