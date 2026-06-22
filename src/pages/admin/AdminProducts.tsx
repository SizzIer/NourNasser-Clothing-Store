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

const AdminProducts = () => null;

export default AdminProducts;
