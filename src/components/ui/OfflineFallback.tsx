"use client";

import { WifiOff, RefreshCw } from "lucide-react";

interface OfflineFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  showRetryButton?: boolean;
  className?: string;
}

export default function OfflineFallback({
  title = "Sem conexão com a internet",
  message = "Verifique sua conexão e tente novamente. Alguns dados podem estar desatualizados.",
  onRetry,
  isRetrying = false,
  showRetryButton = true,
  className = "",
}: OfflineFallbackProps) {
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        {/* Icon */}
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <WifiOff className="h-8 w-8 text-gray-400" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

        {/* Message */}
        <p className="text-sm text-gray-600 max-w-md">{message}</p>

        {/* Retry Button */}
        {showRetryButton && onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Tentando..." : "Tentar novamente"}</span>
          </button>
        )}

        {/* Offline indicator */}
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
          <span>Modo offline</span>
        </div>
      </div>
    </div>
  );
}
