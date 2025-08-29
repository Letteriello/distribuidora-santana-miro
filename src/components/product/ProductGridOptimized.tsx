"use client";

import React, { memo } from "react";
import ProductCardOptimized from "../ProductCardOptimized";
import ProductFallback from "./ProductFallback";
import InfiniteScroll from "../InfiniteScroll";
import { NormalizedProduct } from "../../hooks/useProductsAPIOptimized";
import { cn } from "../../lib/utils";

interface ProductGridOptimizedProps {
  products: NormalizedProduct[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  showQuickActions?: boolean;
  showStock?: boolean;
  onAddToCart?: (product: NormalizedProduct) => void;
  onToggleFavorite?: (product: NormalizedProduct) => void;
  onViewDetails?: (product: NormalizedProduct) => void;
  favoriteProducts?: Set<string>;
}

const ProductGridOptimized: React.FC<ProductGridOptimizedProps> = memo(
  ({
    products,
    isLoading,
    hasMore,
    onLoadMore,
    error,
    onRetry,
    className,
    showQuickActions = true,
    showStock = true,
    onAddToCart,
    onToggleFavorite,
    onViewDetails,
    favoriteProducts = new Set(),
  }) => {
    // Loading inicial
    if (isLoading && products.length === 0) {
      return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-7 sm:h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Erro ou sem produtos
    if (!products.length && !isLoading) {
      return (
        <ProductFallback
          error={error}
          onRetry={onRetry}
          hasFilters={true}
          className="py-8 sm:py-16"
        />
      );
    }

    return (
      <div className={cn("max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8", className)}>
        <InfiniteScroll
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={onLoadMore}
          threshold={0.1}
          rootMargin="200px"
          loadingComponent={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600 font-medium">Carregando mais produtos...</span>
              </div>
            </div>
          }
          endMessage={
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Todos os produtos foram carregados!
                </h3>
                <p className="text-gray-600">
                  Você visualizou {products.length} produtos do nosso catálogo.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Use os filtros acima para refinar sua busca.
                </p>
              </div>
            </div>
          }
        >
          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
              <ProductCardOptimized
                key={product.externalId}
                product={product}
                onAddToCart={onAddToCart}
                onToggleFavorite={onToggleFavorite}
                onViewDetails={onViewDetails}
                isFavorite={favoriteProducts.has(product.externalId)}
                showQuickActions={showQuickActions}
                showStock={showStock}
              />
            ))}
          </div>
        </InfiniteScroll>

        {/* Status Info */}
        {products.length > 0 && (
          <div className="text-center mt-6 text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-4">
              <span>{products.length} produtos carregados</span>
              {hasMore && <span className="text-blue-600">• Mais produtos disponíveis</span>}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ProductGridOptimized.displayName = "ProductGridOptimized";

export default ProductGridOptimized;
