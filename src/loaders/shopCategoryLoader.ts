import { LoaderFunctionArgs } from "react-router-dom";

export const shopCategoryLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const subcategory = url.searchParams.get("subcategory") || undefined;
  return {
    category: params.category ?? "",
    subcategory,
  };
};
