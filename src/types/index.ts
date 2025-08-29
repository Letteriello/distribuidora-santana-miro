import { Id } from "../../convex/_generated/dataModel";

// Tipos baseados nos schemas do Convex
export interface Product {
  _id: Id<"products">;
  externalId: string;
  name: string;
  image: string;
  price: number;
  availableQuantity: number;
  category: string;
  brand: string;
  unit: string;
  description?: string;
  isActive: boolean;
  lastSyncAt: number;
  cd_tpoprd?: number; // Código da categoria da API externa
}

export interface Category {
  _id: Id<"categories">;
  name: string;
  productCount: number;
  isActive: boolean;
  cd_tpoprd?: number; // ID da categoria da API externa
}

export interface CartItem {
  productId: Id<"products">;
  quantity: number;
  unitPrice: number;
}

export interface CartSession {
  _id: Id<"cart_sessions">;
  sessionId: string;
  items: CartItem[];
  totalItems: number;
  totalValue: number;
  createdAt: number;
  updatedAt: number;
}

export interface SyncLog {
  _id: Id<"sync_logs">;
  operation: "sync_products" | "sync_categories";
  status: "success" | "error";
  message?: string;
  recordsProcessed?: number;
  timestamp: number;
}

// Tipos para componentes e UI
export interface CartItemWithProduct {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    externalId: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    availableQuantity: number;
    isActive: boolean;
    image?: string;
    unit?: string;
    lastSyncAt?: number;
  };
}

export interface CartData {
  _id?: Id<"cart_sessions">;
  sessionId: string;
  items: CartItemWithProduct[];
  totalItems: number;
  totalAmount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProductFilters {
  categories: string[];
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  availability: "all" | "inStock" | "outOfStock";
  search?: string;
  sortBy?: "name" | "price" | "category";
  sortOrder?: "asc" | "desc";
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  hasMore: boolean;
}

export interface CategoryStats {
  totalCategories: number;
  totalProducts: number;
  avgProductsPerCategory: number;
  categories: {
    name: string;
    productCount: number;
    percentage: number;
  }[];
}

export interface CartValidationIssue {
  productId: string;
  type:
    | "product_not_found"
    | "product_inactive"
    | "insufficient_stock"
    | "price_changed"
    | "validation_error";
  message: string;
  availableQuantity?: number;
  requestedQuantity?: number;
  oldPrice?: number;
  newPrice?: number;
}

export interface CartValidation {
  isValid: boolean;
  hasIssues: boolean;
  issues: CartValidationIssue[];
}

// Tipos para API externa (Fiscal Fácil)
export interface ExternalProduct {
  id: number;
  nome: string;
  marca: string;
  categoria: string;
  preco: number;
  quantidade_disponivel: number;
  ativo: boolean;
}

export interface ExternalApiResponse {
  success: boolean;
  data: ExternalProduct[];
  total: number;
  page: number;
  per_page: number;
}

// Tipos para WhatsApp integration
export interface WhatsAppMessage {
  sessionId: string;
  customerName: string;
  customerPhone: string;
  items: CartItemWithProduct[];
  totalValue: number;
  message: string;
}

// Tipos para componentes de UI
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasMore?: boolean;
}

export interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

// Tipos para hooks
export interface UseCartReturn {
  cart: CartData | null;
  isLoading: boolean;
  error: string | null;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateCartItemQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  validateCart: () => Promise<CartValidation>;
  lastUpdate?: number;
}

export interface UseProductsReturn {
  products: Product[];
  featuredProducts: Product[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  updateFilters: (newFilters: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  searchProducts: (query: string) => void;
  filterByCategory: (category: string) => void;
  filterByPrice: (min?: number, max?: number) => void;
  filterByAvailability: (availability: ProductFilters["availability"]) => void;
  sortProducts: (sortBy: ProductFilters["sortBy"], sortOrder?: ProductFilters["sortOrder"]) => void;
  loadMore: () => void;
  refetch: () => void;
}

// Tipos adicionais para componentes
export interface CartSummaryData {
  totalItems: number;
  totalAmount: number;
  hasIssues: boolean;
}

export interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

export interface UseProductReturn {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseCategoryProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}
