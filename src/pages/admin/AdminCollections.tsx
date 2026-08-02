import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiPlus,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";
import toast from "react-hot-toast";

interface CatalogProduct {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  category: string;
}

interface AdminCollection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  createdAt: string;
  productCount: number;
  productIds: number[];
  products: CatalogProduct[];
}

interface CollectionFormData {
  name: string;
  description: string;
  isFeatured: boolean;
  productIds: number[];
}

const EMPTY_FORM: CollectionFormData = {
  name: "",
  description: "",
  isFeatured: false,
  productIds: [],
};

function resolveAdminImage(imageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("http")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/assets/")) return imageUrl;
  if (imageUrl.startsWith("/images/")) {
    return `/assets/${imageUrl.replace(/^\/images\//, "")}`;
  }
  if (imageUrl.startsWith("/")) return imageUrl;
  return `/assets/${imageUrl}`;
}

function CollectionModal({
  collection,
  catalog,
  onClose,
  onSave,
}: {
  collection: AdminCollection | null;
  catalog: CatalogProduct[];
  onClose: () => void;
  onSave: (data: CollectionFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<CollectionFormData>(
    collection
      ? {
          name: collection.name,
          description: collection.description ?? "",
          isFeatured: collection.isFeatured,
          productIds: [...collection.productIds],
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [productQuery, setProductQuery] = useState("");

  const selectedProducts = useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p]));
    return form.productIds
      .map((id) => byId.get(id))
      .filter((p): p is CatalogProduct => Boolean(p));
  }, [catalog, form.productIds]);

  const availableProducts = useMemo(() => {
    const selected = new Set(form.productIds);
    const q = productQuery.trim().toLowerCase();
    return catalog.filter((p) => {
      if (selected.has(p.id)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [catalog, form.productIds, productQuery]);

  const addProduct = (id: number) =>
    setForm((f) =>
      f.productIds.includes(id)
        ? f
        : { ...f, productIds: [...f.productIds, id] }
    );

  const removeProduct = (id: number) =>
    setForm((f) => ({
      ...f,
      productIds: f.productIds.filter((pid) => pid !== id),
    }));

  const moveProduct = (id: number, direction: -1 | 1) =>
    setForm((f) => {
      const index = f.productIds.indexOf(id);
      if (index < 0) return f;
      const next = index + direction;
      if (next < 0 || next >= f.productIds.length) return f;
      const productIds = [...f.productIds];
      const [item] = productIds.splice(index, 1);
      productIds.splice(next, 0, item);
      return { ...f, productIds };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Collection name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-800">
            {collection ? "Edit Collection" : "New Collection"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700"
            type="button"
          >
            <FiX size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 gap-5 px-6 py-6"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={INPUT}
              placeholder="e.g. New Arrivals"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className={`${INPUT} resize-none`}
              rows={3}
              placeholder="Optional short pitch for this drop…"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) =>
                setForm((f) => ({ ...f, isFeatured: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            Feature on homepage (“See Collection”)
          </label>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Products ({form.productIds.length})
            </label>

            {selectedProducts.length > 0 ? (
              <ul className="flex flex-col gap-2 border border-gray-100 rounded p-2">
                {selectedProducts.map((product, index) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1.5"
                  >
                    {product.imageUrl ? (
                      <img
                        src={resolveAdminImage(product.imageUrl)}
                        alt=""
                        className="w-9 h-9 object-cover rounded border border-gray-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-gray-200" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {product.category}
                      </p>
                    </div>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveProduct(product.id, -1)}
                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <FiChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === selectedProducts.length - 1}
                        onClick={() => moveProduct(product.id, 1)}
                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <FiChevronDown size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="p-1 text-gray-300 hover:text-red-500"
                      aria-label="Remove"
                    >
                      <FiX size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">No products in this collection yet.</p>
            )}

            <input
              type="search"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className={INPUT}
              placeholder="Search products to add…"
            />
            <ul className="max-h-48 overflow-y-auto border border-gray-100 rounded divide-y divide-gray-50">
              {availableProducts.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-400">
                  No matching products
                </li>
              ) : (
                availableProducts.slice(0, 40).map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(product.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      {product.imageUrl ? (
                        <img
                          src={resolveAdminImage(product.imageUrl)}
                          alt=""
                          className="w-8 h-8 object-cover rounded border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-200" />
                      )}
                      <span className="text-sm text-gray-800 truncate">
                        {product.name}
                      </span>
                      <FiPlus size={14} className="ml-auto text-[#A78BFA]" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#0f0f0f] text-white text-sm font-semibold uppercase tracking-widest rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Saving…"
                : collection
                  ? "Save Changes"
                  : "Create Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const INPUT =
  "w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-colors placeholder:text-gray-300";

const AdminCollections = () => {
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCollection, setModalCollection] = useState<
    AdminCollection | null | undefined
  >(undefined);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminFetch.get<AdminCollection[]>("/collections"),
      adminFetch.get<
        Array<{
          id: number;
          name: string;
          imageUrl: string;
          price: number;
          category: string;
        }>
      >("/products"),
    ])
      .then(([collectionsRes, productsRes]) => {
        setCollections(collectionsRes.data);
        setCatalog(
          productsRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            imageUrl: resolveAdminImage(p.imageUrl),
            price: p.price,
            category: p.category,
          }))
        );
      })
      .catch(() => toast.error("Failed to load collections"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (data: CollectionFormData) => {
    try {
      if (modalCollection) {
        await adminFetch.put(`/collections/${modalCollection.id}`, data);
        toast.success("Collection updated");
      } else {
        await adminFetch.post("/collections", data);
        toast.success("Collection created");
      }
      setModalCollection(undefined);
      fetchAll();
    } catch {
      toast.error("Failed to save collection");
    }
  };

  const handleDelete = async (collection: AdminCollection) => {
    if (
      !window.confirm(
        `Delete "${collection.name}"? Products stay in the catalog.`
      )
    ) {
      return;
    }
    try {
      await adminFetch.delete(`/collections/${collection.id}`);
      toast.success("Collection deleted");
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
    } catch {
      toast.error("Failed to delete collection");
    }
  };

  const handleFeature = async (collection: AdminCollection) => {
    try {
      await adminFetch.put(`/collections/${collection.id}`, {
        isFeatured: !collection.isFeatured,
      });
      toast.success(
        collection.isFeatured
          ? "Removed from homepage feature"
          : "Set as featured collection"
      );
      fetchAll();
    } catch {
      toast.error("Failed to update featured status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Collections</h2>
        <button
          onClick={() => setModalCollection(null)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white text-sm font-semibold uppercase tracking-wider rounded hover:bg-gray-800 transition-colors"
        >
          <FiPlus size={16} />
          New Collection
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Loading collections…</p>
        ) : collections.length === 0 ? (
          <p className="text-sm text-gray-400 p-6">
            No collections yet. Create one for a drop or “New Arrivals”.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50">
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Featured</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <tr key={collection.id} className="border-t border-gray-100">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">
                        {collection.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        /collection/{collection.slug}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {collection.productCount}
                    </td>
                    <td className="py-3 px-4">
                      {collection.isFeatured ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#A78BFA]">
                          <FiStar size={12} />
                          Featured
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleFeature(collection)}
                          className="p-1.5 text-gray-400 hover:text-[#A78BFA]"
                          title={
                            collection.isFeatured
                              ? "Unfeature"
                              : "Feature on homepage"
                          }
                        >
                          <FiStar size={16} />
                        </button>
                        <button
                          onClick={() => setModalCollection(collection)}
                          className="p-1.5 text-gray-400 hover:text-[#A78BFA]"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(collection)}
                          className="p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalCollection !== undefined && (
        <CollectionModal
          collection={modalCollection}
          catalog={catalog}
          onClose={() => setModalCollection(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default AdminCollections;
