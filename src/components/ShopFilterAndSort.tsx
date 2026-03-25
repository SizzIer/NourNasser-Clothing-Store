import { useAppSelector } from "../hooks";
import { formatCategoryName } from "../utils/formatCategoryName";

const ShopFilterAndSort = ({
  sortCriteria,
  setSortCriteria,
  category,
  subcategory,
  subcategoryOptions,
  onSubcategoryChange,
}: {
  sortCriteria: string;
  setSortCriteria: (value: string) => void;
  category?: string;
  subcategory?: string;
  subcategoryOptions?: string[];
  onSubcategoryChange?: (value: string | undefined) => void;
}) => {
  const { showingProducts, totalProducts } = useAppSelector(state => state.shop)
  return (
    <div className="flex w-full justify-between items-center max-sm:flex-col max-sm:gap-5">
      <div className="flex flex-col gap-2 max-sm:w-full">
        <p className="text-lg">Showing 1–{ showingProducts } of { totalProducts } results</p>
        {category && subcategoryOptions && subcategoryOptions.length > 0 && onSubcategoryChange && (
          <label className="flex items-center gap-2 text-sm max-sm:flex-col max-sm:items-start">
            <span className="text-gray-700">Type:</span>
            <select
              className="border border-[rgba(0,0,0,0.40)] px-2 py-1 rounded min-w-[160px]"
              value={subcategory || ""}
              onChange={(e) => {
                const v = e.target.value;
                onSubcategoryChange(v ? v : undefined);
              }}
            >
              <option value="">All types</option>
              {subcategoryOptions.map((s) => {
                const value = s.toLowerCase();
                return (
                  <option key={value} value={value}>
                    {formatCategoryName(s)}
                  </option>
                );
              })}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-3 items-center">
        <p>Sort by:</p>
        <div className="relative">
          <select
            className="border border-[rgba(0,0,0,0.40)] px-2 py-1"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSortCriteria(e.target.value)
            }
            value={sortCriteria}
          >
            <option value="default">Default</option>
            <option value="popularity">Popularity</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>
    </div>
  );
};
export default ShopFilterAndSort;
