import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getOrCreateSessionId, clearSessionId } from "../lib/utils";
import type { CartValidation, CartValidationIssue, UseCartReturn } from "../types";
import { useProductsAPI } from "./useProductsAPI";

export function useCartAPI(): UseCartReturn {
  const [sessionId, setSessionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { products } = useProductsAPI({});

  // Inicializar sessionId no cliente
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Query para buscar carrinho
  const cartData = useQuery(api.queries.cart.getCartBySession, sessionId ? { sessionId } : "skip");

  // Mutations
  const addToCartMutation = useMutation(api.mutations.cart.cartOperations.addToCart);
  const removeFromCartMutation = useMutation(api.mutations.cart.cartOperations.removeFromCart);
  const updateQuantityMutation = useMutation(
    api.mutations.cart.cartOperations.updateCartItemQuantity
  );
  const clearCartMutation = useMutation(api.mutations.cart.cartOperations.clearCart);

  // Query para validação - removida pois não está sendo usada

  // Adicionar item ao carrinho usando externalId
  const addToCart = useCallback(
    async (productExternalId: string, quantity: number) => {
      if (!sessionId) {
        setError("Sessão não inicializada");
        return;
      }

      try {
        setError(null);

        // Buscar dados do produto da API externa
        const product = products.find((p) => p.externalId === productExternalId);
        if (!product) {
          throw new Error("Produto não encontrado");
        }

        if (product.availableQuantity < quantity) {
          throw new Error(`Apenas ${product.availableQuantity} unidades disponíveis`);
        }

        await addToCartMutation({
          sessionId,
          productId: productExternalId as Id<"products">,
          quantity,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao adicionar item ao carrinho";
        setError(errorMessage);
        throw err;
      }
    },
    [sessionId, addToCartMutation, products]
  );

  // Remover item do carrinho usando externalId
  const removeFromCart = useCallback(
    async (productExternalId: string) => {
      if (!sessionId) {
        setError("Sessão não inicializada");
        return;
      }

      try {
        setError(null);
        await removeFromCartMutation({ sessionId, productId: productExternalId as Id<"products"> });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao remover item do carrinho";
        setError(errorMessage);
        throw err;
      }
    },
    [sessionId, removeFromCartMutation]
  );

  // Atualizar quantidade usando externalId
  const updateQuantity = useCallback(
    async (productExternalId: string, quantity: number) => {
      if (!sessionId) {
        setError("Sessão não inicializada");
        return;
      }

      try {
        setError(null);

        // Buscar dados atualizados do produto da API externa
        const product = products.find((p) => p.externalId === productExternalId);
        if (!product) {
          throw new Error("Produto não encontrado");
        }

        if (product.availableQuantity < quantity) {
          throw new Error(`Apenas ${product.availableQuantity} unidades disponíveis`);
        }

        await updateQuantityMutation({
          sessionId,
          productId: productExternalId as Id<"products">,
          quantity,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar quantidade";
        setError(errorMessage);
        throw err;
      }
    },
    [sessionId, updateQuantityMutation, products]
  );

  // Limpar carrinho
  const clearCart = useCallback(async () => {
    if (!sessionId) {
      setError("Sessão não inicializada");
      return;
    }

    try {
      setError(null);
      await clearCartMutation({ sessionId });
      // Gerar novo sessionId após limpar
      clearSessionId();
      setSessionId(getOrCreateSessionId());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao limpar carrinho";
      setError(errorMessage);
      throw err;
    }
  }, [sessionId, clearCartMutation]);

  // Validar carrinho com dados em tempo real da API
  const validateCart = useCallback(async (): Promise<CartValidation> => {
    if (!cartData?.items?.length) {
      return { isValid: true, hasIssues: false, issues: [] };
    }

    const issues: CartValidationIssue[] = [];

    for (const item of cartData.items) {
      try {
        const product = products.find((p) => p.externalId === item.productId);

        if (!product) {
          issues.push({
            type: "product_not_found",
            productId: item.productId,
            message: "Produto não encontrado",
          });
          continue;
        }

        // Verificar estoque
        if (product.availableQuantity < item.quantity) {
          issues.push({
            type: "insufficient_stock",
            productId: item.productId,
            message: `Estoque insuficiente. Disponível: ${product.availableQuantity}`,
            availableQuantity: product.availableQuantity,
          });
        }

        // Verificar mudança de preço
        if (Math.abs(product.price - item.unitPrice) > 0.01) {
          issues.push({
            type: "price_changed",
            productId: item.productId,
            message: `Preço alterado de R$ ${item.unitPrice.toFixed(2)} para R$ ${product.price.toFixed(2)}`,
            oldPrice: item.unitPrice,
            newPrice: product.price,
          });
        }
      } catch {
        issues.push({
          type: "validation_error",
          productId: item.productId,
          message: "Erro ao validar produto",
        });
      }
    }

    return {
      isValid: issues.length === 0,
      hasIssues: issues.length > 0,
      issues,
    };
  }, [cartData, products]);

  return {
    cart: cartData || null,
    isLoading: cartData === undefined,
    error,
    addToCart,
    removeFromCart,
    updateCartItemQuantity: updateQuantity,
    clearCart,
    validateCart,
  };
}
