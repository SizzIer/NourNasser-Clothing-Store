import { useEffect, useState, useCallback } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";
import toast from "react-hot-toast";

interface AdminOrder {
  id: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  user: { name: string; email: string } | null;
  items: { id: number; quantity: number; unitPrice: number; product: { name: string } }[];
}

interface OrdersResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_OPTIONS = ["Pending", "Processing", "Shipped", "Completed", "Cancelled"];
const FILTER_TABS = ["All", ...STATUS_OPTIONS];

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Processing: "bg-blue-100 text-blue-800",
  Shipped: "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

const PAYMENT_STYLES: Record<string, string> = {
  Completed: "text-green-600",
  Pending: "text-amber-600",
  Failed: "text-red-600",
};

const AdminOrders = () => null;

export default AdminOrders;
