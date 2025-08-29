import { useEffect, useRef, useCallback } from "react";
import { useCartStore } from "../stores/cartStore";

/**
 * Hook para sincronização do carrinho entre abas usando BroadcastChannel
 * Garante que mudanças no carrinho sejam refletidas em todas as abas abertas
 */
export const useCartSync = () => {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const isUpdatingRef = useRef<boolean>(false);

  const debouncedUpdate = useCallback((data: { lastUpdated: string; timestamp: number }) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (isUpdatingRef.current) return;

      try {
        const currentState = useCartStore.getState();
        const newTimestamp = new Date(data.lastUpdated).getTime();
        const currentTimestamp = currentState.lastUpdated.getTime();

        // Verificar se a atualização é realmente mais recente
        if (newTimestamp <= currentTimestamp || newTimestamp <= lastSyncTimestampRef.current) {
          return;
        }

        // Recarregar do localStorage
        const stored = localStorage.getItem("cart-storage");
        if (!stored) return;

        const parsedState = JSON.parse(stored);
        if (!parsedState?.state) return;

        const newState = parsedState.state;

        // Verificar se há mudanças reais nos dados
        const hasChanges =
          JSON.stringify(currentState.items) !== JSON.stringify(newState.items) ||
          currentState.sessionId !== newState.sessionId;

        if (!hasChanges) return;

        isUpdatingRef.current = true;
        lastSyncTimestampRef.current = newTimestamp;

        // Atualizar apenas os dados relevantes
        useCartStore.setState({
          items: newState.items || [],
          sessionId: newState.sessionId || currentState.sessionId,
          lastUpdated: new Date(newState.lastUpdated || Date.now()),
        });

        // Reset flag após um pequeno delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      } catch (error) {
        if (DEBUG) console.error("Erro ao sincronizar carrinho entre abas:", error);
        isUpdatingRef.current = false;
      }
    }, 150); // Debounce de 150ms
  }, []);

  useEffect(() => {
    // Verificar se BroadcastChannel está disponível
    if (typeof BroadcastChannel === "undefined") {
      if (DEBUG) console.warn("BroadcastChannel não suportado neste navegador");
      return;
    }

    const channel = new BroadcastChannel("cart-sync");

    // Listener para eventos de outras abas
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      if (type === "CART_UPDATED" && data?.lastUpdated) {
        debouncedUpdate(data);
      }
    };

    channel.addEventListener("message", handleMessage);

    // Listener para mudanças locais do carrinho
    const unsubscribe = useCartStore.subscribe(
      (state) => state.lastUpdated,
      (lastUpdated) => {
        // Evitar notificar durante atualizações de sincronização
        if (isUpdatingRef.current) return;

        // Notificar outras abas sobre a mudança
        channel.postMessage({
          type: "CART_UPDATED",
          data: {
            lastUpdated: lastUpdated.toISOString(),
            timestamp: Date.now(),
          },
        });
      }
    );

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      channel.removeEventListener("message", handleMessage);
      channel.close();
      unsubscribe();
    };
  }, [debouncedUpdate]);
};

/**
 * Hook para detectar mudanças no localStorage do carrinho
 * Fallback para navegadores que não suportam BroadcastChannel
 */
export const useCartStorageSync = () => {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const lastProcessedTimestampRef = useRef<number>(0);

  const debouncedStorageUpdate = useCallback((newValue: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (isUpdatingRef.current) return;

      try {
        const parsedState = JSON.parse(newValue);
        if (!parsedState?.state) return;

        const currentState = useCartStore.getState();
        const newTimestamp = new Date(parsedState.state.lastUpdated || 0).getTime();
        const currentTimestamp = currentState.lastUpdated.getTime();

        // Verificar se a atualização é realmente mais recente
        if (newTimestamp <= currentTimestamp || newTimestamp <= lastProcessedTimestampRef.current) {
          return;
        }

        // Verificar se há mudanças reais nos dados
        const hasChanges =
          JSON.stringify(currentState.items) !== JSON.stringify(parsedState.state.items) ||
          currentState.sessionId !== parsedState.state.sessionId;

        if (!hasChanges) return;

        isUpdatingRef.current = true;
        lastProcessedTimestampRef.current = newTimestamp;

        useCartStore.setState({
          items: parsedState.state.items || [],
          sessionId: parsedState.state.sessionId || currentState.sessionId,
          lastUpdated: new Date(parsedState.state.lastUpdated || Date.now()),
        });

        // Reset flag após um pequeno delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      } catch (error) {
        if (DEBUG) console.error("Erro ao processar mudança do localStorage:", error);
        isUpdatingRef.current = false;
      }
    }, 200); // Debounce de 200ms para storage events
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "cart-storage" && event.newValue) {
        debouncedStorageUpdate(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [debouncedStorageUpdate]);
};

/**
 * Hook principal que combina ambas as estratégias de sincronização
 */
export const useCartCrossTabSync = () => {
  useCartSync();
  useCartStorageSync();
};
