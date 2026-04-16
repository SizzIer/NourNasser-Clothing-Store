import { HiBars3 } from "react-icons/hi2";
import { HiOutlineUser } from "react-icons/hi2";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { Link } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";
import CategoryNavBar from "./CategoryNavBar";
import { useState } from "react";
import { useAppSelector } from "../hooks";

const Header = () => {
  const [ isSidebarOpen, setIsSidebarOpen ] = useState(false);
  const cartItemCount = useAppSelector((state) =>
    state.cart.productsInCart.reduce((sum, p) => sum + p.quantity, 0)
  );
  const cartLabel =
    cartItemCount === 0
      ? "Shopping cart"
      : `Shopping cart, ${cartItemCount} item${cartItemCount === 1 ? "" : "s"}`;
  return (
    <>
    <header className="sticky top-0 z-40 bg-white border-b border-black/10">
    <div className="max-w-screen-2xl flex text-center justify-between items-center py-4 px-5 text-black mx-auto max-sm:px-5 max-[400px]:px-3">
      <HiBars3 className="text-2xl max-sm:text-xl mr-20 max-lg:mr-0 cursor-pointer" onClick={() => setIsSidebarOpen(true)} />
      <Link
        to="/"
        className="font-brand text-4xl font-semibold tracking-tight antialiased max-sm:text-3xl max-[400px]:text-2xl"
      >
        Kind Stitch
      </Link>
      <div className="flex gap-4 items-center max-sm:gap-2">
        <Link to="/search">
          <HiOutlineMagnifyingGlass className="text-2xl max-sm:text-xl" />
        </Link>
        <Link to="/login">
          <HiOutlineUser className="text-2xl max-sm:text-xl" />
        </Link>
        <Link
          to="/cart"
          className="relative inline-flex"
          aria-label={cartLabel}
        >
          <HiOutlineShoppingBag className="text-2xl max-sm:text-xl" aria-hidden />
          {cartItemCount > 0 ? (
            <span
              className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondaryBrown px-1 text-[10px] font-bold leading-none text-white tabular-nums"
              aria-hidden
            >
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </span>
          ) : null}
        </Link>
      </div>
    </div>
    <CategoryNavBar />
    </header>
    <SidebarMenu isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
    </>
  );
};
export default Header;
