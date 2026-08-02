import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import customFetch from "../axios/custom";
import { ProductItem } from "../components";

interface CollectionPayload {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  products: Product[];
}

const Collection = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<CollectionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    customFetch
      .get<CollectionPayload>(`/collections/${slug}`)
      .then((res) => setCollection(res.data))
      .catch(() => {
        setCollection(null);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-5 py-24 text-center text-black/50">
        Loading collection…
      </div>
    );
  }

  if (notFound || !collection) {
    return (
      <div className="max-w-screen-2xl mx-auto px-5 py-24 text-center">
        <h1 className="text-4xl mb-4">Collection not found</h1>
        <Link to="/shop" className="text-secondaryBrown underline">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto w-full px-5 max-[400px]:px-3 pb-24">
      <div className="mt-16 mb-10 text-center max-w-2xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-secondaryBrown mb-3">
          Collection
        </p>
        <h1 className="text-5xl font-normal tracking-[1.56px] max-sm:text-4xl">
          {collection.name}
        </h1>
        {collection.description ? (
          <p className="mt-4 text-lg text-black/60">{collection.description}</p>
        ) : null}
      </div>

      {collection.products.length === 0 ? (
        <p className="text-center text-black/50 py-16">
          No products in this collection yet.
        </p>
      ) : (
        <div className="grid w-full grid-cols-1 justify-items-center gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.products.map((product) => (
            <ProductItem
              key={product.id}
              id={String(product.id)}
              image={product.image}
              title={product.title}
              category={product.category}
              price={product.price}
              popularity={product.popularity}
              stock={product.stock}
              description={product.description}
              inventory={product.inventory}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Collection;
