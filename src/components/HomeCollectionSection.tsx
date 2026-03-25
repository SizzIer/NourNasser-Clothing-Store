import ProductGrid from "./ProductGrid";
import ProductGridWrapper from "./ProductGridWrapper";

const HomeCollectionSection = () => {
  return (
    <div className="max-w-screen-2xl mx-auto w-full px-5 max-[400px]:px-3">
      <div className="flex items-center justify-between mt-24">
        <h2 className="text-black text-5xl font-normal tracking-[1.56px] max-sm:text-4xl">
          Our Collection
        </h2>
      </div>
      <ProductGridWrapper limit={6}>
        <ProductGrid />
      </ProductGridWrapper>
    </div>
  );
};
export default HomeCollectionSection;
