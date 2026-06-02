import { LoaderFunctionArgs, redirect } from "react-router-dom";
import customFetch from "../axios/custom";

export const singleOrderHistoryLoader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params;
  try {
    const response = await customFetch.get(`/orders/${id}`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return redirect("/order-history");
    }
    throw error;
  }
};
