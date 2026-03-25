import { useEffect, useState } from "react";
import customFetch from "../axios/custom";

export function useShopCategories() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);

  useEffect(() => {
    customFetch
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  return categories;
}
