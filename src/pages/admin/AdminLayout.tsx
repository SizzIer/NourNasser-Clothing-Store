import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiShoppingBag,
  FiBox,
  FiUsers,
  FiArrowLeft,
  FiMenu,
  FiX,
  FiLogOut,
} from "react-icons/fi";

 const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: FiGrid, end: true },
   { to: "/admin/orders", label: "Orders", icon: FiShoppingBag, end: false },
   { to: "/admin/products", label: "Products", icon: FiBox, end: false },
   { to: "/admin/customers", label: "Customers", icon: FiUsers, end: false },
 ];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!user?.id || user.role !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [navigate, user?.id, user?.role]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  if (!user?.id || user.role !== "admin") return null;

  const Sidebar = ({ onClose }: { onClose?: () => void }) => (
    <aside className="flex flex-col h-full bg-[#0f0f0f] text-white w-64 shrink-0">
      {/* Brand */}
      <div className="px-6 pt-8 pb-6 border-b border-white/10">
        <p className="text-[10px] tracking-[0.25em] text-gray-500 uppercase mb-1">Admin Panel</p>
        <h1 className="text-lg font-bold tracking-widest uppercase leading-tight">
          Kind Stitch
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
         {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-[#0f0f0f]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))} 
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6 space-y-1 border-t border-white/10 pt-4">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 rounded text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <FiArrowLeft size={16} />
          Back to Store
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <FiLogOut size={16} />
          Log Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-brand">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 h-full shadow-xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:pl-64 min-h-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 shrink-0 z-20">
          <button
            className="lg:hidden p-1 text-gray-500 hover:text-gray-800"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu size={20} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 leading-none">Signed in as</p>
              <p className="text-sm font-medium text-gray-800 leading-tight mt-0.5">
                {user.name} {user.lastname}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#A78BFA] flex items-center justify-center text-white text-xs font-bold uppercase">
              {(user.name?.[0] || "A")}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
