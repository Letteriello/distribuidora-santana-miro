"use client";

import { Package, RefreshCw, AlertCircle } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import OfflineFallback from "../ui/OfflineFallback";
import NetworkErrorIndicator from "../ui/NetworkErrorIndicator";

interface ProductFallbackProps {
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  hasFilters?: boolean;
  className?: string;
}

export default function ProductFallback({
  error,
  onRetry,
  isRetrying = false,
  hasFilters = false,
  className = "",
}: ProductFallbackProps) {
  const networkStatus = useNetworkStatus();

  // Se há erro e não estamos online, mostrar fallback offline
  if (error && !networkStatus.isOnline) {
    return (
      <div className={className}>
        <OfflineFallback
          title="Produtos indisponíveis"
          message="Não foi possível carregar os produtos. Verifique sua conexão com a internet e tente novamente."
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  // Se há erro mas estamos online, mostrar indicador de erro de rede
  if (error) {
    return (
      <div className={className}>
        <NetworkErrorIndicator
          error={error}
          onRetry={onRetry}
          isRetrying={isRetrying}
          variant="card"
        />
      </div>
    );
  }

  // Estado normal sem produtos (sem erro)
  if (hasFilters) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum produto encontrado</h3>
          <p className="text-gray-600 mb-4">
            Não encontramos produtos que correspondam aos filtros selecionados.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• Tente remover alguns filtros</p>
            <p>• Verifique a ortografia dos termos de busca</p>
            <p>• Use termos mais gerais</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
        <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum produto disponível</h3>
        <p className="text-gray-600 mb-4">
          Os produtos aparecerão aqui após a sincronização com o sistema.
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Carregando..." : "Tentar carregar produtos"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Componente específico para quando há problemas críticos de conectividade
export function CriticalConnectivityFallback({
  onRetry,
  isRetrying = false,
  className = "",
}: {
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-red-900 mb-2">Falha crítica de conectividade</h3>
        <p className="text-red-700 mb-4">
          Não foi possível estabelecer conexão com o servidor. O sistema está operando em modo
          degradado.
        </p>

        <div className="space-y-3">
          <div className="text-sm text-red-600 bg-red-100 rounded p-3">
            <p className="font-medium mb-1">O que você pode fazer:</p>
            <ul className="text-left space-y-1">
              <li>• Verificar sua conexão com a internet</li>
              <li>• Aguardar alguns minutos e tentar novamente</li>
              <li>• Entrar em contato com o suporte se o problema persistir</li>
            </ul>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
              <span>{isRetrying ? "Tentando reconectar..." : "Tentar reconectar"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
