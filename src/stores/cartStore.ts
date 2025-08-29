import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Product } from "@/types";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  addedAt: Date;
}

export interface CartState {
  items: CartItem[];
  sessionId: string;
  isLoading: boolean;
  lastUpdated: Date;
  // Cache computado para evitar recálculos
  _itemCount: number;
  _totalPrice: number;
}

export interface CartActions {
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotalPrice: () => number;
  getCartItem: (productId: string) => CartItem | undefined;
  validateCart: () => Promise<{ hasIssues: boolean; issues: { message: string }[] }>;
  setLoading: (loading: boolean) => void;
  _updateComputedValues: () => void;
}

type CartStore = CartState & CartActions;

// Função para gerar sessionId único
const generateSessionId = (): string => {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Função para buscar dados do produto da API
const fetchProductData = async (productId: string): Promise<Product | null> => {
  try {
    const response = await fetch(`https://api.fiscalfacil.com/products/${productId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

// Função para calcular valores computados
const computeCartValues = (items: CartItem[]) => {
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => {
    const priceValue = item.product.price;
    let price = 0;

    if (typeof priceValue === "string" && priceValue) {
      price = parseFloat((priceValue as string).replace(/[^\d.,]/g, "").replace(",", "."));
    } else if (typeof priceValue === "number") {
      price = priceValue;
    }

    return total + price * item.quantity;
  }, 0);

  return { itemCount, totalPrice };
};

// Store principal do carrinho
export const useCartStore = create<CartStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Estado inicial
        items: [],
        sessionId: generateSessionId(),
        isLoading: false,
        lastUpdated: new Date(),
        _itemCount: 0,
        _totalPrice: 0,

        // Função interna para atualizar valores computados
        _updateComputedValues: () => {
          const state = get();
          const { itemCount, totalPrice } = computeCartValues(state.items);
          set((draft) => {
            draft._itemCount = itemCount;
            draft._totalPrice = totalPrice;
          });
        },

        // Actions
        addToCart: async (product: Product, quantity = 1) => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            // Buscar dados atualizados do produto se necessário
            let productData = product;
            if (!product.price || !product.name) {
              const fetchedProduct = await fetchProductData(product.externalId);
              if (fetchedProduct) {
                productData = fetchedProduct;
              }
            }

            set((state) => {
              const existingItem = state.items.find((item) => item.id === productData.externalId);

              if (existingItem) {
                existingItem.quantity += quantity;
              } else {
                state.items.push({
                  id: productData.externalId,
                  product: productData,
                  quantity,
                  addedAt: new Date(),
                });
              }

              state.lastUpdated = new Date();
              state.isLoading = false;

              // Atualizar valores computados
              const { itemCount, totalPrice } = computeCartValues(state.items);
              state._itemCount = itemCount;
              state._totalPrice = totalPrice;
            });

            // Disparar evento customizado para sincronização
            window.dispatchEvent(
              new CustomEvent("cartUpdated", {
                detail: { action: "add", productId: productData.externalId, quantity },
              })
            );
          } catch (error) {
            if (DEBUG) console.error("Erro ao adicionar produto ao carrinho:", error);
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        removeFromCart: (productId: string) => {
          set((state) => {
            const index = state.items.findIndex((item) => item.id === productId);
            if (index !== -1) {
              state.items.splice(index, 1);
              state.lastUpdated = new Date();

              // Atualizar valores computados
              const { itemCount, totalPrice } = computeCartValues(state.items);
              state._itemCount = itemCount;
              state._totalPrice = totalPrice;
            }
          });

          window.dispatchEvent(
            new CustomEvent("cartUpdated", {
              detail: { action: "remove", productId },
            })
          );
        },

        updateQuantity: (productId: string, quantity: number) => {
          if (quantity <= 0) {
            get().removeFromCart(productId);
            return;
          }

          set((state) => {
            const item = state.items.find((item) => item.id === productId);
            if (item) {
              item.quantity = quantity;
              state.lastUpdated = new Date();

              // Atualizar valores computados
              const { itemCount, totalPrice } = computeCartValues(state.items);
              state._itemCount = itemCount;
              state._totalPrice = totalPrice;
            }
          });

          window.dispatchEvent(
            new CustomEvent("cartUpdated", {
              detail: { action: "update", productId, quantity },
            })
          );
        },

        clearCart: () => {
          set((state) => {
            state.items = [];
            state.sessionId = generateSessionId();
            state.lastUpdated = new Date();
            state._itemCount = 0;
            state._totalPrice = 0;
          });

          window.dispatchEvent(
            new CustomEvent("cartUpdated", {
              detail: { action: "clear" },
            })
          );
        },

        getItemCount: () => {
          return get()._itemCount;
        },

        getTotalPrice: () => {
          return get()._totalPrice;
        },

        getCartItem: (productId: string) => {
          return get().items.find((item) => item.id === productId);
        },

        validateCart: async () => {
          const { items } = get();
          const issues: { message: string }[] = [];
          const validatedItems: CartItem[] = [];

          for (const item of items) {
            const productData = await fetchProductData(item.product.externalId);
            if (productData) {
              // Verificar se o produto ainda está disponível
              if (!productData.isActive) {
                issues.push({ message: `${item.product.name} não está mais disponível` });
              } else if (productData.availableQuantity < item.quantity) {
                issues.push({
                  message: `${item.product.name}: apenas ${productData.availableQuantity} unidades disponíveis`,
                });
              } else {
                validatedItems.push({
                  ...item,
                  product: productData,
                });
              }
            } else {
              issues.push({ message: `${item.product.name} não foi encontrado` });
            }
          }

          set((state) => {
            state.items = validatedItems;
            state.lastUpdated = new Date();

            // Atualizar valores computados
            const { itemCount, totalPrice } = computeCartValues(state.items);
            state._itemCount = itemCount;
            state._totalPrice = totalPrice;
          });

          return {
            hasIssues: issues.length > 0,
            issues,
          };
        },

        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },
      })),
      {
        name: "cart-storage",
        partialize: (state) => ({
          items: state.items,
          sessionId: state.sessionId,
          lastUpdated: state.lastUpdated,
        }),
        onRehydrateStorage: () => (state) => {
          // Recalcular valores computados após hidratação
          if (state) {
            const { itemCount, totalPrice } = computeCartValues(state.items);
            state._itemCount = itemCount;
            state._totalPrice = totalPrice;
          }
        },
      }
    )
  )
);

// Seletores otimizados com shallow comparison
export const useCartItems = (): CartItem[] => useCartStore((state) => state.items);

// Seletores memoizados que usam cache interno
export const useCartItemCount = (): number => useCartStore((state) => state._itemCount);

export const useCartTotal = (): number => useCartStore((state) => state._totalPrice);

export const useCartLoading = (): boolean => useCartStore((state) => state.isLoading);

// Actions memoizadas para evitar re-renders
const cartActionsSelector = (state: CartState & CartActions) => ({
  addToCart: state.addToCart,
  removeFromCart: state.removeFromCart,
  updateQuantity: state.updateQuantity,
  clearCart: state.clearCart,
  getItemCount: state.getItemCount,
  getTotalPrice: state.getTotalPrice,
  getCartItem: state.getCartItem,
  validateCart: state.validateCart,
  setLoading: state.setLoading,
  _updateComputedValues: state._updateComputedValues,
});

export const useCartActions = (): CartActions => useCartStore(cartActionsSelector);

// Hook para obter item específico do carrinho
export const useCartItem = (productId: string): CartItem | undefined =>
  useCartStore((state) => state.getCartItem(productId));

// Hook para dados básicos do carrinho (otimizado)
const cartSummarySelector = (state: CartState) => ({
  itemCount: state._itemCount,
  totalPrice: state._totalPrice,
  isEmpty: state.items.length === 0,
});

export const useCartSummary = (): {
  itemCount: number;
  totalPrice: number;
  isEmpty: boolean;
} => useCartStore(cartSummarySelector);
