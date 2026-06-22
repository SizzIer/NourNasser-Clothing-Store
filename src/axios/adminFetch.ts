import axios from "axios";

const adminFetch = axios.create({
  baseURL: "/api/admin",
  headers: { Accept: "application/json" },
});

adminFetch.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.id) config.headers["x-admin-id"] = String(user.id);
  return config;
});

export default adminFetch;
