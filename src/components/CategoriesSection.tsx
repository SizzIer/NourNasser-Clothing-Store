import CategoryItem from "./CategoryItem";

const CategoriesSection = () => {
  return (
    <div className="max-w-screen-2xl px-5 mx-auto mt-24">
      <h2 className="text-black text-5xl font-normal tracking-[1.56px] max-sm:text-4xl mb-12">
        Our Categories
      </h2>
      <div className="flex justify-between flex-wrap gap-y-10">
        <CategoryItem
          categoryTitle="Bottoms"
          image="luxury category 1.png"
          link="special-edition"
        />
        <CategoryItem
          categoryTitle="Tops"
          image="luxury category 2.png"
          link="Tops"
        />
        <CategoryItem
          categoryTitle="Accessories"
          image="luxury category 3.png"
          link="summer-edition"
        />
        <CategoryItem
          categoryTitle=""
          image="luxury category 4.png"
          link="unique-collection"
        />
      </div>
    </div>
  );
};
export default CategoriesSection;
