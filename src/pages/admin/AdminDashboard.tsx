import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiDollarSign, FiShoppingBag, FiUsers, FiBox, FiArrowRight } from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";

interface DashboardStats {
  totalRevenue: number;
  orderCount: number;
  customerCount: number;
  productCount: number;
  recentOrders: RecentOrder[];
  monthlyRevenue: Record<string, number>;
}

interface RecentOrder {
  id: number;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  user: { name: string; email: string } | null;
  items: { id: number }[];
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Processing: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
  Shipped: "bg-purple-100 text-purple-800",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function RevenueChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-6">Revenue (Last 6 Months)</h3>
      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm">No revenue data yet.</p>
      ) : (
        <div className="flex items-end gap-3 h-36">
          {entries.map(([key, val]) => {
            const [, month] = key.split("-");
            const label = MONTH_LABELS[parseInt(month, 10) - 1];
            const pct = (val / max) * 100;
            return (
              <div key={key} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-[10px] text-gray-500">${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}</span>
                <div className="w-full flex items-end justify-center">
                  <div
                    className="w-full bg-[#A78BFA] rounded-t transition-all"
                    style={{ height: `${Math.max(pct, 4)}%`, maxHeight: "100px", minHeight: "4px" }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-medium">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const AdminDashboard = () => null;

export default AdminDashboard;
