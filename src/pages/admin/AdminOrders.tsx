import { useEffect, useState, useCallback } from "react";
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp } from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";
import toast from "react-hot-toast";

interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  size: string | null;
  color: string | null;
  product: { name: string };
}

interface AdminOrder {
  id: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  apartment: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  user: { name: string; email: string } | null;
  items: OrderItem[];
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

function OrderDetail({ order }: { order: AdminOrder }) {
  const customerName =
    [order.firstName, order.lastName].filter(Boolean).join(" ") ||
    order.user?.name ||
    null;
  const customerEmail = order.email || order.user?.email || null;

  const hasShipping =
    order.address || order.city || order.country || order.phone || customerName;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-5 bg-gray-50/70">
      {/* Shipping / Customer info */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Customer &amp; Shipping
        </p>
        {hasShipping ? (
          <div className="text-sm space-y-0.5">
            {customerName && <p className="font-medium text-gray-800">{customerName}</p>}
            {customerEmail && <p className="text-gray-500">{customerEmail}</p>}
            {order.phone && <p className="text-gray-500">{order.phone}</p>}
            {order.address && (
              <p className="text-gray-700 pt-1">
                {order.address}
                {order.apartment ? `, ${order.apartment}` : ""}
              </p>
            )}
            {(order.city || order.region || order.postalCode) && (
              <p className="text-gray-700">
                {[order.city, order.region, order.postalCode].filter(Boolean).join(", ")}
              </p>
            )}
            {order.country && <p className="text-gray-700">{order.country}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No shipping details on record</p>
        )}
      </div>

      {/* Items breakdown */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Items ({order.items.length})
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-200">
              <th className="text-left pb-1 pr-2 font-medium">Product</th>
              <th className="text-left pb-1 pr-2 font-medium">Size</th>
              <th className="text-left pb-1 pr-2 font-medium">Color</th>
              <th className="text-right pb-1 pr-2 font-medium">Qty</th>
              <th className="text-right pb-1 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 pr-2 text-gray-700">{item.product.name}</td>
                <td className="py-1.5 pr-2 text-gray-500">{item.size || "—"}</td>
                <td className="py-1.5 pr-2 text-gray-500">{item.color || "—"}</td>
                <td className="py-1.5 pr-2 text-right text-gray-700">×{item.quantity}</td>
                <td className="py-1.5 text-right text-gray-700 font-medium">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td colSpan={4} className="pt-2 text-xs text-gray-400 uppercase tracking-wider">
                Order Total
              </td>
              <td className="pt-2 text-right font-bold text-gray-800">
                ${order.total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    adminFetch
      .get<OrdersResponse>("/orders", {
        params: {
          page,
          limit,
          status: statusFilter === "All" ? undefined : statusFilter,
        },
      })
      .then((res) => {
        setOrders(res.data.orders);
        setTotal(res.data.total);
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    try {
      await adminFetch.put(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
              setExpandedId(null);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
              statusFilter === tab
                ? "bg-[#0f0f0f] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-400 p-6">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      onClick={() => toggleExpand(order.id)}
                      className="border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        <div className="flex items-center gap-1.5">
                          #{order.id}
                          {expandedId === order.id ? (
                            <FiChevronUp size={13} className="text-gray-400" />
                          ) : (
                            <FiChevronDown size={13} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {order.user ? (
                          <div>
                            <p>{order.user.name}</p>
                            <p className="text-xs text-gray-400">{order.user.email}</p>
                          </div>
                        ) : order.firstName || order.lastName ? (
                          <div>
                            <p>{[order.firstName, order.lastName].filter(Boolean).join(" ")}</p>
                            {order.email && (
                              <p className="text-xs text-gray-400">{order.email}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Guest</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{order.items.length}</td>
                      <td className="py-3 px-4 text-gray-600">${order.total.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <p className="text-gray-600">{order.paymentMethod}</p>
                        <p
                          className={`text-xs font-medium ${
                            PAYMENT_STYLES[order.paymentStatus] || "text-gray-500"
                          }`}
                        >
                          {order.paymentStatus}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${
                            STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-detail`}>
                        <td colSpan={7} className="border-t border-gray-100 p-0">
                          <OrderDetail order={order} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
