import { useEffect, useState, useCallback, useRef } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";
import toast from "react-hot-toast";

const MAX_IMAGES = 10;
const FABRIC_MAX_LENGTH = 100;
const CARE_MAX_LENGTH = 300;

interface InventoryRow {
  size: string;
  color: string;
  stock: number;
}

interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  images: string | null;
  inventory: string | null;
  category: string;
  subcategory: string | null;
  fabric: string | null;
  careInstructions: string | null;
  stock: number;
  createdAt: string;
  collectionIds?: number[];
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  images: string[];
  inventory: InventoryRow[];
  category: string;
  subcategory: string;
  fabric: string;
  careInstructions: string;
  stock: number;
  collectionIds: number[];
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  description: "",
  price: 0,
  imageUrl: "",
  images: [],
  inventory: [],
  category: "",
  subcategory: "",
  fabric: "",
  careInstructions: "",
  stock: 0,
  collectionIds: [],
};

function parseProductImages(product: AdminProduct): string[] {
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through
    }
  }
  return product.imageUrl ? [product.imageUrl] : [];
}

function parseProductInventory(product: AdminProduct): InventoryRow[] {
  if (product.inventory) {
    try {
      const parsed = JSON.parse(product.inventory);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }
  return [];
}

function computeTotalStock(inventory: InventoryRow[], manualStock: number): number {
  if (inventory.length > 0) {
    return inventory.reduce((sum, row) => sum + (row.stock || 0), 0);
  }
  return manualStock;
}

const PREFERRED_CATEGORIES = [
  "Tops",
  "Bottoms",
  "Accessories",
  "Gloves & Mittens",
  "Scarves",
];

function slugKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueBySlug(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const cleaned = name.trim();
    if (!cleaned) continue;
    const key = slugKey(cleaned);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function categoryOptions(products: AdminProduct[]): string[] {
  return uniqueBySlug([
    ...PREFERRED_CATEGORIES,
    ...products.map((p) => p.category),
  ]);
}

function subcategoryOptions(
  products: AdminProduct[],
  category: string
): string[] {
  const want = slugKey(category);
  return uniqueBySlug(
    products
      .filter(
        (p) =>
          p.subcategory &&
          (!want || slugKey(p.category) === want)
      )
      .map((p) => p.subcategory as string)
  ).sort((a, b) => a.localeCompare(b));
}

function ProductModal({
  product,
  products,
  collections,
  onClose,
  onSave,
}: {
  product: AdminProduct | null;
  products: AdminProduct[];
  collections: Array<{ id: number; name: string; isFeatured: boolean }>;
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
          images: parseProductImages(product),
          inventory: parseProductInventory(product),
          category: product.category,
          subcategory: product.subcategory ?? "",
          fabric: product.fabric ?? "",
          careInstructions: product.careInstructions ?? "",
          stock: product.stock,
          collectionIds: product.collectionIds ?? [],
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (
    field: keyof Omit<ProductFormData, "images" | "inventory" | "collectionIds">,
    value: string | number
  ) => setForm((f) => ({ ...f, [field]: value }));

  const toggleCollection = (collectionId: number) =>
    setForm((f) => ({
      ...f,
      collectionIds: f.collectionIds.includes(collectionId)
        ? f.collectionIds.filter((id) => id !== collectionId)
        : [...f.collectionIds, collectionId],
    }));

  // ── Image handlers ──────────────────────────────────────────
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images reached`);
      e.target.value = "";
      return;
    }
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      const urls = await Promise.all(
        toUpload.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await adminFetch.post<{ url: string }>("/upload", fd);
          return res.data.url;
        })
      );
      setForm((f) => {
        const next = [...f.images, ...urls];
        return { ...f, images: next, imageUrl: next[0] || f.imageUrl };
      });
    } catch {
      toast.error("Failed to upload image(s)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setForm((f) => {
      const next = f.images.filter((_, i) => i !== index);
      return { ...f, images: next, imageUrl: next[0] || "" };
    });
  };

  // ── Inventory handlers ───────────────────────────────────────
  const addInventoryRow = () =>
    setForm((f) => ({
      ...f,
      inventory: [...f.inventory, { size: "", color: "", stock: 0 }],
    }));

  const removeInventoryRow = (index: number) =>
    setForm((f) => ({
      ...f,
      inventory: f.inventory.filter((_, i) => i !== index),
    }));

  const updateInventoryRow = (
    index: number,
    field: keyof InventoryRow,
    value: string | number
  ) =>
    setForm((f) => ({
      ...f,
      inventory: f.inventory.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      ),
    }));

  const blurInventorySize = (index: number) =>
    setForm((f) => ({
      ...f,
      inventory: f.inventory.map((row, i) =>
        i === index
          ? { ...row, size: row.size.trim().replace(/\s+/g, " ").toUpperCase() }
          : row
      ),
    }));

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || form.price <= 0) {
      toast.error("Name, category, and a valid price are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        imageUrl: form.images[0] || "",
        stock: computeTotalStock(form.inventory, form.stock),
      });
    } finally {
      setSaving(false);
    }
  };

  const hasInventory = form.inventory.length > 0;
  const inventoryTotal = form.inventory.reduce((s, r) => s + (r.stock || 0), 0);
  const categories = categoryOptions(products);
  const subcategories = subcategoryOptions(products, form.category);

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
          {/* Name */}
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

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${INPUT} resize-none`}
              rows={3}
              placeholder="Product description…"
            />
          </Field>

          {/* Price */}
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

          {/* Category + Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category *">
              <input
                type="text"
                list="admin-category-options"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={INPUT}
                placeholder="e.g. Tops"
                required
              />
              <datalist id="admin-category-options">
                {categories.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
            <Field label="Subcategory">
              <input
                type="text"
                list="admin-subcategory-options"
                value={form.subcategory ?? ""}
                onChange={(e) => set("subcategory", e.target.value)}
                className={INPUT}
                placeholder="e.g. T-Shirts"
              />
              <datalist id="admin-subcategory-options">
                {subcategories.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Collections">
            {collections.length === 0 ? (
              <p className="text-xs text-gray-400">
                No collections yet. Create one under Collections.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto border border-gray-100 rounded p-2">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.collectionIds.includes(collection.id)}
                      onChange={() => toggleCollection(collection.id)}
                      className="rounded border-gray-300"
                    />
                    <span>{collection.name}</span>
                    {collection.isFeatured && (
                      <span className="text-[10px] uppercase tracking-wider text-[#A78BFA]">
                        Featured
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </Field>

          {/* Fabric & Care */}
          <Field label="Fabric">
            <textarea
              value={form.fabric ?? ""}
              onChange={(e) => set("fabric", e.target.value.slice(0, FABRIC_MAX_LENGTH))}
              maxLength={FABRIC_MAX_LENGTH}
              rows={2}
              className={`${INPUT} resize-none`}
              placeholder="e.g. 100% Organic Cotton"
            />
            <p className="text-[10px] text-gray-400 text-right">
              {(form.fabric ?? "").length}/{FABRIC_MAX_LENGTH}
            </p>
          </Field>

          <Field label="Care Instructions">
            <textarea
              value={form.careInstructions ?? ""}
              onChange={(e) =>
                set("careInstructions", e.target.value.slice(0, CARE_MAX_LENGTH))
              }
              maxLength={CARE_MAX_LENGTH}
              rows={4}
              className={`${INPUT} resize-none`}
              placeholder="e.g. Machine wash cold, tumble dry low"
            />
            <p className="text-[10px] text-gray-400 text-right">
              {(form.careInstructions ?? "").length}/{CARE_MAX_LENGTH}
            </p>
          </Field>

          {/* Inventory by Size & Color */}
          <Field label="Inventory by Size & Color">
            <datalist id="admin-size-options">
              {["XS", "S", "M", "L", "XL", "XXL", "ONE SIZE"].map((size) => (
                <option key={size} value={size} />
              ))}
            </datalist>
            {hasInventory ? (
              <div className="flex flex-col gap-2">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1fr_68px_28px] gap-1.5 px-0.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Size</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Color</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Stock</span>
                  <span />
                </div>

                {/* Rows */}
                {form.inventory.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_68px_28px] gap-1.5 items-center">
                    <input
                      type="text"
                      value={row.size}
                      onChange={(e) => updateInventoryRow(i, "size", e.target.value)}
                      onBlur={() => blurInventorySize(i)}
                      className={INPUT}
                      placeholder="e.g. M"
                      list="admin-size-options"
                    />
                    <input
                      type="text"
                      value={row.color}
                      onChange={(e) => updateInventoryRow(i, "color", e.target.value)}
                      className={INPUT}
                      placeholder="e.g. Black"
                    />
                    <input
                      type="number"
                      min={0}
                      value={row.stock}
                      onChange={(e) =>
                        updateInventoryRow(i, "stock", parseInt(e.target.value, 10) || 0)
                      }
                      className={`${INPUT} text-right pr-2`}
                    />
                    <button
                      type="button"
                      onClick={() => removeInventoryRow(i)}
                      className="flex items-center justify-center p-1 text-gray-300 hover:text-red-500 transition-colors"
                      aria-label="Remove row"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}

                {/* Footer: add row + total */}
                <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={addInventoryRow}
                    className="flex items-center gap-1 text-xs text-[#A78BFA] hover:text-purple-700 font-medium transition-colors"
                  >
                    <FiPlus size={13} />
                    Add row
                  </button>
                  <p className="text-xs text-gray-500">
                    Total:{" "}
                    <span className="font-semibold text-gray-800">{inventoryTotal}</span>{" "}
                    in stock
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={addInventoryRow}
                className="flex items-center gap-2 w-full px-3 py-2.5 border-2 border-dashed border-gray-200 rounded text-xs text-gray-400 hover:border-[#A78BFA] hover:text-[#A78BFA] justify-center transition-colors"
              >
                <FiPlus size={14} />
                Add size &amp; color
              </button>
            )}
          </Field>

          {/* Photos */}
          <Field label={`Photos (${form.images.length} / ${MAX_IMAGES})`}>
            <div className="grid grid-cols-4 gap-2">
              {form.images.map((url, i) => (
                <div key={i} className="relative aspect-square">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover rounded border border-gray-200"
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[8px] bg-[#A78BFA] text-white px-1 py-0.5 rounded font-bold uppercase leading-none">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full p-0.5 transition-colors"
                  >
                    <FiX size={10} />
                  </button>
                </div>
              ))}
              {form.images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square border-2 border-dashed border-gray-200 rounded flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#A78BFA] hover:text-[#A78BFA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="text-[11px] text-center leading-tight px-1">Uploading…</span>
                  ) : (
                    <>
                      <FiPlus size={18} />
                      <span className="text-[11px]">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            {form.images.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Click "Add Photo" to upload images (JPG, PNG, GIF, WEBP). First image shown as the main product photo.
              </p>
            )}
          </Field>

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={saving || uploading}
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
  const [collections, setCollections] = useState<
    Array<{ id: number; name: string; isFeatured: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState<AdminProduct | null | undefined>(undefined);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminFetch.get<AdminProduct[]>("/products"),
      adminFetch.get<Array<{ id: number; name: string; isFeatured: boolean }>>(
        "/collections"
      ),
    ])
      .then(([productsRes, collectionsRes]) => {
        setProducts(productsRes.data);
        setCollections(
          collectionsRes.data.map((c) => ({
            id: c.id,
            name: c.name,
            isFeatured: c.isFeatured,
          }))
        );
      })
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
                {products.map((product) => {
                  const allImages = parseProductImages(product);
                  const inventoryRows = parseProductInventory(product);
                  const totalStock = computeTotalStock(inventoryRows, product.stock);
                  const skuCount = inventoryRows.length;
                  return (
                    <tr key={product.id} className="border-t border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {allImages.length > 0 && (
                            <div className="relative shrink-0">
                              <img
                                src={allImages[0]}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded border border-gray-200"
                              />
                              {allImages.length > 1 && (
                                <span className="absolute -bottom-1 -right-1 bg-gray-700 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                  {allImages.length}
                                </span>
                              )}
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {product.category}
                        {product.subcategory ? ` / ${product.subcategory}` : ""}
                      </td>
                      <td className="py-3 px-4 text-gray-600">${product.price.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <p className="text-gray-700 font-medium">{totalStock}</p>
                        {skuCount > 0 && (
                          <p className="text-[11px] text-gray-400">{skuCount} SKU{skuCount !== 1 ? "s" : ""}</p>
                        )}
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          products={products}
          collections={collections}
          onClose={() => setModalProduct(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default AdminProducts;
