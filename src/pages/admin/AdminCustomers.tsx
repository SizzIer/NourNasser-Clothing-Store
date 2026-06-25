import { useEffect, useState } from "react";
import { FiMail, FiPhone } from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";
import toast from "react-hot-toast";

interface AdminCustomer {
  id: number;
  name: string;
  lastname: string;
  email: string;
  phone: string | null;
  role: string;
  orderCount: number;
  createdAt: string;
}

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminFetch
      .get<AdminCustomer[]>("/customers")
      .then((res) => {
        if (active) setCustomers(res.data);
      })
      .catch(() => toast.error("Failed to load customers"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">Customers</h2>

      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-gray-400 p-6">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {customer.name} {customer.lastname}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <FiMail size={12} className="text-gray-400" />
                        {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <FiPhone size={12} />
                          {customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {customer.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{customer.orderCount}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(customer.createdAt).toLocaleDateString()}
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

export default AdminCustomers;
