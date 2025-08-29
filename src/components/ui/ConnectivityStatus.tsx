"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Signal, SignalLow } from "lucide-react";
import { useNetworkStatus, useAPIConnectivity } from "@/hooks/useNetworkStatus";

interface ConnectivityStatusProps {
  apiUrl?: string;
  showDetails?: boolean;
  className?: string;
}

export default function ConnectivityStatus({
  apiUrl = "https://fiscalfacil.com/LojaVirtual/14044/produtos",
  showDetails = false,
  className = "",
}: ConnectivityStatusProps) {
  const networkStatus = useNetworkStatus();
  const { isAPIReachable, lastChecked } = useAPIConnectivity(apiUrl);
  const [isVisible, setIsVisible] = useState(false);

  // Mostrar status apenas quando há problemas de conectividade
  useEffect(() => {
    const hasConnectivityIssues =
      !networkStatus.isOnline || networkStatus.isSlowConnection || isAPIReachable === false;

    setIsVisible(hasConnectivityIssues);
  }, [networkStatus.isOnline, networkStatus.isSlowConnection, isAPIReachable]);

  if (!isVisible) return null;

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    if (networkStatus.isSlowConnection) {
      return <SignalLow className="h-4 w-4 text-yellow-500" />;
    }
    if (isAPIReachable === false) {
      return <Signal className="h-4 w-4 text-orange-500" />;
    }
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusMessage = () => {
    if (!networkStatus.isOnline) {
      return "Sem conexão com a internet";
    }
    if (networkStatus.isSlowConnection) {
      return "Conexão lenta detectada";
    }
    if (isAPIReachable === false) {
      return "Problemas de conectividade com o servidor";
    }
    return "Conectado";
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) {
      return "bg-red-50 border-red-200 text-red-800";
    }
    if (networkStatus.isSlowConnection) {
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    }
    if (isAPIReachable === false) {
      return "bg-orange-50 border-orange-200 text-orange-800";
    }
    return "bg-green-50 border-green-200 text-green-800";
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span>{getStatusMessage()}</span>

        {showDetails && (
          <div className="text-xs opacity-75">
            {networkStatus.connectionType && (
              <span className="ml-2">({networkStatus.connectionType})</span>
            )}
            {lastChecked && (
              <span className="ml-2">Verificado: {lastChecked.toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente inline para usar dentro de outros componentes
export function InlineConnectivityStatus({ className = "" }: { className?: string }) {
  const networkStatus = useNetworkStatus();

  if (networkStatus.isOnline && !networkStatus.isSlowConnection) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {!networkStatus.isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Offline</span>
        </>
      ) : networkStatus.isSlowConnection ? (
        <>
          <SignalLow className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-600">Conexão lenta</span>
        </>
      ) : null}
    </div>
  );
}
