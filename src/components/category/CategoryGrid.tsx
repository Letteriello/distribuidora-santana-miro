import React from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import type { Category } from "@/types";
import OfflineFallback from "../ui/OfflineFallback";
import NetworkErrorIndicator from "../ui/NetworkErrorIndicator";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface CategoryGridProps {
  categories: Category[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function CategoryGrid({ categories, isLoading, error, onRetry }: CategoryGridProps) {
  const networkStatus = useNetworkStatus();
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="w-12 h-12 bg-gray-300 rounded-lg mb-4"></div>
            <div className="h-6 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    // Se há erro e não estamos online, mostrar fallback offline
    if (error && !networkStatus.isOnline) {
      return (
        <OfflineFallback
          title="Categorias indisponíveis"
          message="Não foi possível carregar as categorias. Verifique sua conexão com a internet."
          onRetry={onRetry}
          className="my-8"
        />
      );
    }

    // Se há erro mas estamos online, mostrar indicador de erro de rede
    if (error) {
      return (
        <div className="my-8">
          <NetworkErrorIndicator error={error} onRetry={onRetry} variant="card" />
        </div>
      );
    }

    // Estado normal sem categorias
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma categoria encontrada</h3>
        <p className="text-gray-500">
          As categorias aparecerão aqui após a sincronização dos produtos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => (
        <Link
          key={category._id}
          href={`/?category=${encodeURIComponent(category.name)}`}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 group"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 group-hover:bg-blue-200 transition-colors">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {category.name}
          </h3>
          <p className="text-sm text-gray-600">{category.productCount} produtos</p>
        </Link>
      ))}
    </div>
  );
}

export default CategoryGrid;
