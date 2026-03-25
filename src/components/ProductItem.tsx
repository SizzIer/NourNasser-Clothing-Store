import { Link } from "react-router-dom";
import { formatCategoryName } from "../utils/formatCategoryName";

const ProductItem = ({
  id,
  image,
  title,
  category,
  price,
  popularity: _popularity,
  stock: _stock,
}: {
  id: string;
  image: string;
  title: string;
  category: string;
  price: number;
  popularity: number;
  stock: number;
}) => {
  return (
    <div className="flex w-full min-w-0 max-w-[400px] flex-col gap-2 justify-center">
      <Link
        to={`/product/${id}`}
        className="relative block w-full aspect-[3/4] overflow-hidden bg-neutral-100"
      >
        <img
          src={`/assets/${image}`}
          alt={title}
          className="h-full w-full object-cover object-top"
        />
      </Link>
      <Link
        to={`/product/${id}`}
        className="text-black text-center text-3xl tracking-[1.02px] max-md:text-2xl"
      >
        <h2>{title}</h2>
      </Link>
      <p className="text-secondaryBrown text-lg tracking-wide text-center max-md:text-base">
        {formatCategoryName(category)}{" "}
      </p>
      <p className="text-black text-2xl text-center font-bold max-md:text-xl">
        ${price}
      </p>
      <div className="w-full flex flex-col gap-1">
        <Link
          to={`/product/${id}`}
          className="text-white bg-secondaryBrown text-center text-xl font-normal tracking-[0.6px] leading-[72px] w-full h-12 flex items-center justify-center max-md:text-base"
        >
          View product
        </Link>
        <Link
          to={`/product/${id}`}
          className="bg-white text-black text-center text-xl border border-[rgba(0, 0, 0, 0.40)] font-normal tracking-[0.6px] leading-[72px] w-full h-12 flex items-center justify-center max-md:text-base"
        >
          Learn more
        </Link>
      </div>
    </div>
  );
};
export default ProductItem;
