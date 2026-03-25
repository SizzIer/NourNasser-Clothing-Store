import ProductGrid from "./ProductGrid";
import ProductGridWrapper from "./ProductGridWrapper";
import ShopFilterAndSort from "./ShopFilterAndSort";
import ShowingPagination from "./ShowingPagination";

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import customFetch from "../axios/custom";
import { slugify } from "../utils/slugify";

const ShopPageContent = ({
  category,
  subcategory,
  page,
}: {
  category: string;
  subcategory?: string;
  page: number;
}) => {
  const [sortCriteria, setSortCriteria] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(page);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  useEffect(() => {
    customFetch
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  const subcategoryOptions =
    categories.find((c) => c.slug === slugify(category || ""))
      ?.subcategories ?? [];

  const handleSubcategoryChange = useCallback(
    (next: string | undefined) => {
      const params = new URLSearchParams();
      if (next) params.set("subcategory", next);
      const qs = params.toString();
      const base = category ? `/shop/${category}` : "/shop";
      navigate(qs ? `${base}?${qs}` : base);
    },
    [category, navigate]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      setSortCriteria(value);
      if (currentPage === 1 && !searchParams.get("page")) return;
      setCurrentPage(1);
      const params = new URLSearchParams();
      if (subcategory) params.set("subcategory", subcategory);
      const qs = params.toString();
      const base = category ? `/shop/${category}` : "/shop";
      navigate(qs ? `${base}?${qs}` : base, { replace: true });
    },
    [
      category,
      currentPage,
      navigate,
      searchParams,
      subcategory,
    ]
  );

  return (
    <>
      <ShopFilterAndSort
        sortCriteria={sortCriteria}
        setSortCriteria={handleSortChange}
        category={category}
        subcategory={subcategory}
        subcategoryOptions={subcategoryOptions}
        onSubcategoryChange={handleSubcategoryChange}
      />
      <ProductGridWrapper
        sortCriteria={sortCriteria}
        category={category}
        subcategory={subcategory}
        page={currentPage}
      >
        <ProductGrid />
      </ProductGridWrapper>
      <ShowingPagination
        page={currentPage}
        category={category}
        subcategory={subcategory}
        setCurrentPage={setCurrentPage}
      />
    </>
  );
};
export default ShopPageContent;
