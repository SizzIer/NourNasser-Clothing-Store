import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiXMark } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector, useShopCategories } from "../hooks";
import { setLoginStatus } from "../features/auth/authSlice";
import { store } from "../store";

const SidebarMenu = ({
  isSidebarOpen,
  setIsSidebarOpen,
}: {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (prev: boolean) => void;
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const { loginStatus } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const categories = useShopCategories();

  const closeSidebar = () => setIsSidebarOpen(false);

  const logout = () => {
    closeSidebar();
    toast.error("Logged out successfully");
    localStorage.removeItem("user");
    store.dispatch(setLoginStatus(false));
    navigate("/login");
  };

  useEffect(() => {
    if (isSidebarOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300); // Match the transition duration
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen]);

  return (
    <>
      {(isSidebarOpen || isAnimating) && (
        <div
          className={
            isSidebarOpen
              ? "fixed top-0 left-0 w-64 z-50 h-full transition-transform duration-300 ease-in-out bg-white shadow-lg transform border-r border-black translate-x-0"
              : "fixed top-0 left-0 w-64 z-50 h-full transition-transform duration-300 ease-in-out bg-white shadow-lg transform border-r border-black -translate-x-full"
          }
        >
          <div className="flex justify-end mr-1 mt-1">
            <HiXMark
              className="text-3xl cursor-pointer"
              onClick={closeSidebar}
            />
          </div>
          <div className="flex justify-center mt-2">
            <Link
              to="/"
              onClick={closeSidebar}
              className="text-4xl font-light tracking-[1.08px] max-sm:text-3xl max-[400px]:text-2xl"
            >
              Nour Nasser
            </Link>
          </div>
          <div className="flex flex-col items-center gap-1 mt-7">
            <Link
              to="/"
              onClick={closeSidebar}
              className="py-2 border-y border-secondaryBrown w-full block flex justify-center"
            >
              Home
            </Link>
            <Link
              to="/shop"
              onClick={closeSidebar}
              className="py-2 border-y border-secondaryBrown w-full block flex justify-center"
            >
              Shop all
            </Link>
            <p className="w-full text-left text-xs uppercase tracking-wider text-gray-500 px-4 mt-3 mb-1">
              Categories
            </p>
            <div className="w-full flex flex-col gap-0 mb-2">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/shop/${c.slug}`}
                  onClick={closeSidebar}
                  className="py-2 pl-6 pr-4 text-left text-sm border-b border-black/5 hover:bg-black/[0.03]"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <Link
              to="/search"
              onClick={closeSidebar}
              className="py-2 border-y border-secondaryBrown w-full block flex justify-center"
            >
              Search
            </Link>
            {loginStatus ? (
              <>
                <button
                  onClick={logout}
                  className="py-2 border-y border-secondaryBrown w-full block flex justify-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeSidebar}
                  className="py-2 border-y border-secondaryBrown w-full block flex justify-center"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={closeSidebar}
                  className="py-2 border-y border-secondaryBrown w-full block flex justify-center"
                >
                  Sign up
                </Link>
              </>
            )}
            <Link
              to="/cart"
              onClick={closeSidebar}
              className="py-2 border-y border-secondaryBrown w-full block flex justify-center"
            >
              Cart
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
export default SidebarMenu;
