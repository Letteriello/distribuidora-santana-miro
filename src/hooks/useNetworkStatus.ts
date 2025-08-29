"use client";

import { useState, useEffect, useCallback } from "react";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
}

interface NetworkConnection {
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
  });

  useEffect(() => {
    // Verificar se estamos no cliente
    if (typeof window === "undefined") return;

    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      let isSlowConnection = false;
      let connectionType: string | null = null;

      // Verificar tipo de conexão se disponível
      if ("connection" in navigator) {
        const connection = (navigator as NavigatorWithConnection).connection;
        connectionType = connection?.effectiveType || null;

        // Considerar conexão lenta se for 2G ou slow-2g
        isSlowConnection = ["slow-2g", "2g"].includes(connection?.effectiveType || "");
      }

      setNetworkStatus({
        isOnline,
        isSlowConnection,
        connectionType,
      });
    };

    // Atualizar status inicial
    updateNetworkStatus();

    // Listeners para mudanças de conectividade
    const handleOnline = () => {
      if (DEBUG) console.log("🌐 Conexão restaurada");
      updateNetworkStatus();
    };

    const handleOffline = () => {
      if (DEBUG) console.log("📵 Conexão perdida");
      updateNetworkStatus();
    };

    // Listener para mudanças no tipo de conexão
    const handleConnectionChange = () => {
      if (DEBUG) console.log("🔄 Tipo de conexão alterado");
      updateNetworkStatus();
    };

    // Adicionar event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listener para mudanças de conexão (se suportado)
    if ("connection" in navigator) {
      (navigator as NavigatorWithConnection).connection?.addEventListener?.(
        "change",
        handleConnectionChange
      );
    }

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if ("connection" in navigator) {
        (navigator as NavigatorWithConnection).connection?.removeEventListener?.(
          "change",
          handleConnectionChange
        );
      }
    };
  }, []);

  return networkStatus;
}

// Hook para detectar se a API externa está acessível
export function useAPIConnectivity(apiUrl: string) {
  const [isAPIReachable, setIsAPIReachable] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const networkStatus = useNetworkStatus();

  const checkAPIConnectivity = useCallback(
    async (
      url: string = apiUrl
    ): Promise<{ isReachable: boolean; responseTime?: number; error?: string }> => {
      if (!networkStatus.isOnline) {
        setIsAPIReachable(false);
        return {
          isReachable: false,
          error: "Sem conexão com a internet",
        };
      }

      try {
        // Fazer uma requisição HEAD para verificar se a API está acessível
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          mode: "no-cors", // Para evitar problemas de CORS
        });

        clearTimeout(timeoutId);
        setIsAPIReachable(true);
        setLastChecked(new Date());
        return {
          isReachable: true,
        };
      } catch (error: unknown) {
        if (DEBUG) console.warn("⚠️ API não acessível:", error);
        setIsAPIReachable(false);
        setLastChecked(new Date());
        return {
          isReachable: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    },
    [apiUrl, networkStatus.isOnline]
  );

  useEffect(() => {
    checkAPIConnectivity();
    const interval = setInterval(checkAPIConnectivity, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [apiUrl, checkAPIConnectivity]); // Removendo checkAPIConnectivity para evitar loop

  useEffect(() => {
    // Verificar conectividade quando o status da rede mudar
    if (networkStatus.isOnline) {
      checkAPIConnectivity();
    } else {
      setIsAPIReachable(false);
    }
  }, [networkStatus.isOnline, checkAPIConnectivity]);

  return {
    isAPIReachable,
    lastChecked,
    checkConnectivity: checkAPIConnectivity,
    networkStatus,
  };
}
