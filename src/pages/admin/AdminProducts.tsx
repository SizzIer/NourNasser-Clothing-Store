import { useEffect, useState, useCallback } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";
import toast from "react-hot-toast";

interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  subcategory: string | null;
  fabric: string | null;
  stock: number;
  createdAt: string;
}

type ProductFormData = Omit<AdminProduct, "id" | "createdAt">;

const EMPTY_FORM: ProductFormData = {
  name: "",
  description: "",
  price: 0,
  imageUrl: "",
  category: "",
  subcategory: "",
  fabric: "",
  stock: 0,
};

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: AdminProduct | null;
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductFormData>(
    product
      ? {
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          subcategory: product.subcategory ?? "",
          fabric: product.fabric ?? "",
          stock: product.stock,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (field: keyof ProductFormData, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || form.price <= 0) {
      toast.error("Name, category, and a valid price are required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-800">
            {product ? "Edit Product" : "New Product"}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5 px-6 py-6">
          <Field label="Product Name *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={INPUT}
              placeholder="e.g. Linen Wide-Leg Trouser"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${INPUT} resize-none`}
              rows={3}
              placeholder="Product description…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price ($) *">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
                className={INPUT}
                required
              />
            </Field>
            <Field label="Stock">
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set("stock", parseInt(e.target.value, 10) || 0)}
                className={INPUT}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category *">
              <input
                type="text"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={INPUT}
                placeholder="e.g. Tops"
                required
              />
            </Field>
            <Field label="Subcategory">
              <input
                type="text"
                value={form.subcategory ?? ""}
                onChange={(e) => set("subcategory", e.target.value)}
                className={INPUT}
                placeholder="e.g. T-Shirts"
              />
            </Field>
          </div>

          <Field label="Image URL">
            <input
              type="text"
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              className={INPUT}
              placeholder="/images/product.jpg"
            />
          </Field>

          <Field label="Fabric">
            <input
              type="text"
              value={form.fabric ?? ""}
              onChange={(e) => set("fabric", e.target.value)}
              className={INPUT}
              placeholder="e.g. 100% Organic Cotton"
            />
          </Field>

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#0f0f0f] text-white text-sm font-semibold uppercase tracking-widest rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : product ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-colors placeholder:text-gray-300";

const AdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState<AdminProduct | null | undefined>(undefined);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    adminFetch
      .get<AdminProduct[]>("/products")
      .then((res) => setProducts(res.data))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = async (data: ProductFormData) => {
    try {
      if (modalProduct) {
        await adminFetch.put(`/products/${modalProduct.id}`, data);
        toast.success("Product updated");
      } else {
        await adminFetch.post("/products", data);
        toast.success("Product created");
      }
      setModalProduct(undefined);
      fetchProducts();
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await adminFetch.delete(`/products/${product.id}`);
      toast.success("Product deleted");
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch {
      toast.error("Failed to delete product");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Products</h2>
        <button
          onClick={() => setModalProduct(null)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] text-white text-sm font-semibold uppercase tracking-wider rounded hover:bg-gray-800 transition-colors"
        >
          <FiPlus size={16} />
          New Product
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-400 p-6">No products yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded border border-gray-200"
                          />
                        )}
                        <span className="font-medium text-gray-800">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {product.category}
                      {product.subcategory ? ` / ${product.subcategory}` : ""}
                    </td>
                    <td className="py-3 px-4 text-gray-600">${product.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-600">{product.stock}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModalProduct(product)}
                          className="p-1.5 text-gray-400 hover:text-[#A78BFA]"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
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

      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default AdminProducts;
