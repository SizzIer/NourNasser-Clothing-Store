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

interface OrderItemProduct {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  size?: string | null;
  color?: string | null;
  product: OrderItemProduct;
}

interface Order {
  id: number;
  userId: number | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  apartment?: string | null;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  postalCode?: string | null;
  createdAt: string;
  items: OrderItem[];
  user?: User | null;
}
