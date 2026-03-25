import { HiChevronUp } from "react-icons/hi2";
import Button from "./Button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../hooks";

const ShowingSearchPagination = ({ page }: { page: number }) => {
  const { totalProducts, showingProducts } = useAppSelector(state => state.shop);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canLoadMore = totalProducts > 0 && showingProducts < totalProducts;

  return (
    <div className="w-full mt-12 mb-24">
      <div className="flex flex-col gap-6 justify-center items-center w-1/2 mx-auto max-sm:w-3/4 max-sm:gap-5">
        <p className="text-xl max-sm:text-lg">Showing { showingProducts } of { totalProducts }</p>
        {canLoadMore && (
        <Button
          text="View More"
          mode="white"
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set("page", String(page + 1));
            navigate(`/search?${params.toString()}`);
          }}
        />
        )}
        <a href="#gridTop" className="flex justify-center items-center text-xl gap-2 max-sm:text-lg">
          Back to Top <HiChevronUp />
        </a>
      </div>
    </div>
  );
};
export default ShowingSearchPagination;
