import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getOrCreateSessionId, clearSessionId } from "../lib/utils";
import type { CartValidation, CartValidationIssue, UseCartReturn } from "../types";

export function useCart(): UseCartReturn {
  const [sessionId, setSessionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

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

  // Query para validação
  const cartValidation = useQuery(
    api.queries.cart.validateCartItems,
    sessionId ? { sessionId } : "skip"
  );

  // Adicionar item ao carrinho
  const addToCart = useCallback(
    async (productId: string, quantity: number) => {
      if (!sessionId) {
        setError("Sessão não inicializada");
        return;
      }

      try {
        setError(null);
        await addToCartMutation({ sessionId, productId: productId as Id<"products">, quantity });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao adicionar item ao carrinho";
        setError(errorMessage);
        throw err;
      }
    },
    [sessionId, addToCartMutation]
  );

  // Remover item do carrinho
  const removeFromCart = useCallback(
    async (productId: string) => {
      if (!sessionId) {
        setError("Sessão não inicializada");
        return;
      }

      try {
        setError(null);
        await removeFromCartMutation({ sessionId, productId: productId as Id<"products"> });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao remover item do carrinho";
        setError(errorMessage);
        throw err;
      }
    },
    [sessionId, removeFromCartMutation]
  );

  // Atualizar quantidade
  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (!sessionId) {
        setError("Sessão não inicializada");
        return;
      }

      try {
        setError(null);
        await updateQuantityMutation({
          sessionId,
          productId: productId as Id<"products">,
          quantity,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar quantidade";
        setError(errorMessage);
        throw err;
      }
    },
    [sessionId, updateQuantityMutation]
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

  // Validar carrinho
  const validateCart = useCallback(async (): Promise<CartValidation> => {
    if (!cartValidation) {
      return { isValid: true, hasIssues: false, issues: [] };
    }
    return {
      isValid: cartValidation.isValid,
      hasIssues: cartValidation.issues.length > 0,
      issues: cartValidation.issues as CartValidationIssue[],
    };
  }, [cartValidation]);

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
