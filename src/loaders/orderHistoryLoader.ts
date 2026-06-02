import customFetch from "../axios/custom";

export const orderHistoryLoader = async () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id) return [];
    const response = await customFetch.get(`/users/${user.id}/orders`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return [];
  }
};
