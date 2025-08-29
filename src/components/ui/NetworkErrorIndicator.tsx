"use client";

import { AlertTriangle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface NetworkErrorIndicatorProps {
  error: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  showIcon?: boolean;
  variant?: "banner" | "inline" | "card";
  className?: string;
}

export function NetworkErrorIndicator({
  error,
  onRetry,
  isRetrying = false,
  showIcon = true,
  variant = "inline",
  className = "",
}: NetworkErrorIndicatorProps) {
  if (!error) return null;

  const isConnectivityError =
    error.includes("Conectividade") ||
    error.includes("Timeout") ||
    error.includes("net::ERR") ||
    error.includes("Sem conexão") ||
    error.includes("indisponível");

  const isDataOutdated =
    error.includes("desatualizados") || error.includes("podem estar desatualizados");

  const getIcon = () => {
    if (isConnectivityError) {
      return <WifiOff className="h-5 w-5 text-orange-500" />;
    }
    if (isDataOutdated) {
      return <Wifi className="h-5 w-5 text-yellow-500" />;
    }
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  const getColors = () => {
    if (isConnectivityError) {
      return {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-800",
        button: "bg-orange-100 hover:bg-orange-200 text-orange-800",
      };
    }
    if (isDataOutdated) {
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-800",
        button: "bg-yellow-100 hover:bg-yellow-200 text-yellow-800",
      };
    }
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      button: "bg-red-100 hover:bg-red-200 text-red-800",
    };
  };

  const colors = getColors();

  if (variant === "banner") {
    return (
      <div className={`${colors.bg} ${colors.border} border-l-4 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {showIcon && <div className="flex-shrink-0 mr-3">{getIcon()}</div>}
            <div className="flex-1">
              <p className={`text-sm font-medium ${colors.text}`}>
                {isConnectivityError
                  ? "Problema de Conectividade"
                  : isDataOutdated
                    ? "Dados Desatualizados"
                    : "Erro"}
              </p>
              <p className={`text-sm ${colors.text} opacity-90 mt-1`}>{error}</p>
            </div>
          </div>
          {onRetry && (
            <div className="flex-shrink-0 ml-4">
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                size="sm"
                variant="outline"
                className={`${colors.button} border-transparent`}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Tentando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`${colors.bg} ${colors.border} border rounded-lg p-6 text-center ${className}`}
      >
        {showIcon && <div className="flex justify-center mb-4">{getIcon()}</div>}
        <h3 className={`text-lg font-medium ${colors.text} mb-2`}>
          {isConnectivityError
            ? "Problema de Conectividade"
            : isDataOutdated
              ? "Dados Desatualizados"
              : "Erro"}
        </h3>
        <p className={`text-sm ${colors.text} opacity-90 mb-4`}>{error}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            size="sm"
            variant="outline"
            className={`${colors.button} border-transparent`}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Tentando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // variant === 'inline'
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && getIcon()}
      <span className={`text-sm ${colors.text}`}>{error}</span>
      {onRetry && (
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          size="sm"
          variant="ghost"
          className={`${colors.text} hover:${colors.bg} p-1 h-auto`}
        >
          {isRetrying ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

export default NetworkErrorIndicator;
