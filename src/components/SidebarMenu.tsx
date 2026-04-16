import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiXMark } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector, useShopCategories } from "../hooks";
import { setLoginStatus } from "../features/auth/authSlice";
import { store } from "../store";

const navItemClass =
  "mx-3 flex items-center rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium text-black/70 transition-colors duration-150 hover:bg-black/[0.06] hover:text-black active:bg-black/[0.08]";

const SidebarMenu = ({
  isSidebarOpen,
  setIsSidebarOpen,
}: {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (prev: boolean) => void;
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const { loginStatus } = useAppSelector((state) => state.auth);
  const cartItemCount = useAppSelector((state) =>
    state.cart.productsInCart.reduce((sum, p) => sum + p.quantity, 0)
  );
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
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    const timer = setTimeout(() => setIsAnimating(false), 300);
    document.body.style.overflow = "";
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  return (
    <>
      {(isSidebarOpen || isAnimating) && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className={`fixed inset-0 z-[45] bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
              isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={closeSidebar}
          />
          <aside
            className={
              isSidebarOpen
                ? "fixed top-0 left-0 z-50 flex h-full w-[min(20rem,92vw)] flex-col bg-white shadow-[4px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out translate-x-0"
                : "fixed top-0 left-0 z-50 flex h-full w-[min(20rem,92vw)] flex-col bg-white shadow-[4px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out -translate-x-full"
            }
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-4 pb-4 pt-5">
              <Link
                to="/"
                onClick={closeSidebar}
                className="font-brand min-w-0 flex-1 text-center text-3xl font-semibold tracking-tight text-black antialiased max-[400px]:text-2xl"
              >
                Kind Stitch
              </Link>
              <button
                type="button"
                onClick={closeSidebar}
                className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-black/45 transition-colors hover:bg-black/[0.06] hover:text-black"
                aria-label="Close menu"
              >
                <HiXMark className="text-2xl" />
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-3">
              <div className="flex flex-col gap-0.5 px-1">
                <Link to="/" onClick={closeSidebar} className={navItemClass}>
                  Home
                </Link>
                <Link to="/shop" onClick={closeSidebar} className={navItemClass}>
                  Shop all
                </Link>
              </div>

              <div className="mx-5 my-4 h-px bg-black/[0.06]" aria-hidden />

              <p className="mb-1.5 px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                Categories
              </p>
              <div className="flex flex-col gap-0.5 px-1 pb-2">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/shop/${c.slug}`}
                    onClick={closeSidebar}
                    className={navItemClass}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>

              <div className="mx-5 my-3 h-px bg-black/[0.06]" aria-hidden />

              <div className="flex flex-col gap-0.5 px-1">
                <Link to="/search" onClick={closeSidebar} className={navItemClass}>
                  Search
                </Link>
                <Link
                  to="/cart"
                  onClick={closeSidebar}
                  className={`${navItemClass} justify-between gap-2`}
                >
                  <span>Cart</span>
                  {cartItemCount > 0 ? (
                    <span className="rounded-full bg-secondaryBrown px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                      {cartItemCount > 99 ? "99+" : cartItemCount}
                    </span>
                  ) : null}
                </Link>
              </div>

              <div className="mt-auto border-t border-black/[0.06] px-1 pb-6 pt-3">
                {loginStatus ? (
                  <button
                    type="button"
                    onClick={logout}
                    className={`${navItemClass} w-full max-w-none text-left text-black/55 hover:text-black`}
                  >
                    Log out
                  </button>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <Link
                      to="/login"
                      onClick={closeSidebar}
                      className={navItemClass}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeSidebar}
                      className={`${navItemClass} text-black`}
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </aside>
        </>
      )}
    </>
  );
};
export default SidebarMenu;
