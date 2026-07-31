import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiDollarSign, FiShoppingBag, FiUsers, FiBox, FiArrowRight, FiLock } from "react-icons/fi";
import toast from "react-hot-toast";
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof FiDollarSign;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6 flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-[#A78BFA]/10 flex items-center justify-center text-[#A78BFA] shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    adminFetch
      .get<DashboardStats>("/stats")
      .then((res) => {
        if (active) setStats(res.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error("Enter your current password and a new password.");
      return;
    }

    if (newPassword.trim().length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    try {
      setChangingPassword(true);
      await adminFetch.put("/password", {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      const message = error?.response?.data?.error || "Failed to update password";
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading dashboard…</p>;
  }

  if (!stats) {
    return <p className="text-sm text-red-500">Failed to load dashboard stats.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={FiDollarSign} />
        <StatCard label="Orders" value={String(stats.orderCount)} icon={FiShoppingBag} />
        <StatCard label="Customers" value={String(stats.customerCount)} icon={FiUsers} />
        <StatCard label="Products" value={String(stats.productCount)} icon={FiBox} />
      </div>

      <RevenueChart data={stats.monthlyRevenue} />

      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiLock className="text-[#A78BFA]" size={18} />
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-700">
            Current Password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="border border-gray-200 rounded px-3 py-2 outline-none focus:border-[#A78BFA]"
              placeholder="Enter current password"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-700">
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="border border-gray-200 rounded px-3 py-2 outline-none focus:border-[#A78BFA]"
              placeholder="Enter new password"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="bg-[#0f0f0f] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Recent Orders</h3>
          <Link
            to="/admin/orders"
            className="text-xs font-medium text-[#A78BFA] flex items-center gap-1 hover:underline"
          >
            View all <FiArrowRight size={12} />
          </Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="text-gray-400 text-sm">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Items</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-800">#{order.id}</td>
                    <td className="py-3 pr-4 text-gray-600">
                      {order.user ? `${order.user.name} (${order.user.email})` : "Guest"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{order.items.length}</td>
                    <td className="py-3 pr-4 text-gray-600">${order.total.toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
