import { Link } from "react-router-dom";
import { useShopCategories } from "../hooks";

const CategoryNavBar = () => {
  const categories = useShopCategories();

  if (categories.length === 0) return null;

  return (
    <nav
      className="border-t border-black/10 bg-white/95 backdrop-blur-sm"
      aria-label="Product categories"
    >
      <div className="max-w-screen-2xl mx-auto px-5 max-[400px]:px-3 py-2.5 overflow-x-auto">
        <ul className="flex flex-wrap sm:flex-nowrap sm:justify-center items-center gap-x-4 gap-y-2 min-w-min text-sm sm:text-base text-black/90">
          <li className="shrink-0">
            <Link
              to="/shop"
              className="inline-block px-1 py-0.5 rounded hover:text-secondaryBrown tracking-wide"
            >
              Shop all
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                to={`/shop/${c.slug}`}
                className="inline-block px-1 py-0.5 rounded hover:text-secondaryBrown tracking-wide whitespace-nowrap"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default CategoryNavBar;
