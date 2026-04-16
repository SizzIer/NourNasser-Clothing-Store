interface FabricCompositionRow {
  fiber: string;
  percent: number;
}

interface Product {
  id: number;
  title: string;
  description?: string;
  image: string;
  category: string;
  categorySlug?: string;
  subcategory?: string | null;
  /** Short material note (weave / blend); composition table carries percentages. */
  fabric?: string | null;
  /** Fiber mix with percentages (sums to 100% per piece where listed). */
  composition?: FabricCompositionRow[] | null;
  careInstructions?: string | null;
  /** PDP color options (labels). */
  colors?: string[] | null;
  price: number;
  popularity: number;
  stock: number;
}

interface ShopCategory {
  name: string;
  slug: string;
  productCount: number;
  subcategories: string[];
}

interface ProductInCart extends Product {
  id: string;
  quantity: number;
  size: string;
  color: string;
  stock: number;
}

interface User {
  id: number;
  name: string;
  lastname: string;
  email: string;
  phone?: string | null;
  role: string;
  password?: string;
}

interface Order {
  id: number;
  orderStatus: string;
  orderDate: string;
  data: {
    email: string;
  };
  products: ProductInCart[];
  subtotal: number;
  user: {
    email: string;
    id: number;
  };
}
