"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useProductsAPIOptimized } from "@/hooks/useProductsAPIOptimized";
import ProductFilters from "@/components/product/ProductFilters";
import ProductGridOptimized from "@/components/product/ProductGridOptimized";
import NetworkErrorIndicator from "@/components/ui/NetworkErrorIndicator";
import { useCartActions } from "@/stores/cartStore";

import type { ProductFilters as ProductFiltersType } from "@/types";
import type { NormalizedProduct } from "@/hooks/useProductsAPIOptimized";
import type { Id } from "../../convex/_generated/dataModel";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

function HomeContentOptimized() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("categoria");

  // Cart store
  const { addToCart } = useCartActions();

  // Favorites state (pode ser movido para um store depois)
  const [favoriteProducts, setFavoriteProducts] = useState<Set<string>>(new Set());

  // Hook otimizado - deve vir antes do useEffect que usa updateFilters
  const { products, isLoading, error, hasMore, totalCount, loadMore, refresh, updateFilters } =
    useProductsAPIOptimized({
      initialFilters: {
        search: "",
        category: categoryFromUrl || "",
        brand: "",
        minPrice: undefined,
        maxPrice: undefined,
        sortBy: "name",
        sortOrder: "asc",
      },
    });

  // Update filters when URL changes - agora updateFilters já está definida
  useEffect(() => {
    const newCategory = categoryFromUrl || "";
    if (newCategory) {
      updateFilters({
        search: "",
        category: newCategory,
        brand: "",
        minPrice: undefined,
        maxPrice: undefined,
        sortBy: "name",
        sortOrder: "asc",
      });
    }
  }, [categoryFromUrl, updateFilters]);

  const handleFiltersChange = (newFilters: ProductFiltersType) => {
    updateFilters(newFilters);
  };

  const handleAddToCart = (product: NormalizedProduct) => {
    try {
      addToCart(
        {
          _id: { __tableName: "products" } as unknown as Id<"products">,
          externalId: product.externalId,
          name: product.name,
          price: product.price,
          image: product.image || "",
          availableQuantity: product.availableQuantity,
          category: product.category,
          brand: product.brand,
          unit: "un",
          isActive: true,
          description: product.description || "",
          lastSyncAt: Date.now(),
        },
        1
      );

      // Feedback visual (pode ser implementado com toast)
      if (DEBUG) console.log(`Produto ${product.name} adicionado ao carrinho`);
    } catch (error) {
      if (DEBUG) console.error("Erro ao adicionar produto ao carrinho:", error);
    }
  };

  const handleToggleFavorite = (product: NormalizedProduct) => {
    setFavoriteProducts((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(product.externalId)) {
        newFavorites.delete(product.externalId);
      } else {
        newFavorites.add(product.externalId);
      }
      return newFavorites;
    });
  };

  const handleViewDetails = (product: NormalizedProduct) => {
    // Implementar navegação para página de detalhes
    if (DEBUG) console.log("Ver detalhes do produto:", product.name);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Distribuidora Mirô</h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8">
              Catálogo otimizado com carregamento inteligente
            </p>
            <div className="max-w-2xl mx-auto">
              <p className="text-lg text-primary-50">
                Navegue por nosso catálogo com performance otimizada. Os produtos são carregados
                progressivamente para uma experiência mais rápida e fluida.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Error Banner */}
      {error && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <NetworkErrorIndicator error={error} onRetry={refresh} variant="banner" />
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <ProductFilters
          filters={{
            categories: [],
            availability: "all",
            search: "",
            category: "",
            brand: "",
            minPrice: undefined,
            maxPrice: undefined,
            sortBy: "name",
            sortOrder: "asc",
          }}
          totalProducts={totalCount}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Products Section */}
      <ProductGridOptimized
        products={products}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        error={error}
        onRetry={refresh}
        onAddToCart={handleAddToCart}
        onToggleFavorite={handleToggleFavorite}
        onViewDetails={handleViewDetails}
        favoriteProducts={favoriteProducts}
        showQuickActions={true}
        showStock={true}
      />
    </div>
  );
}

export default function HomeOptimized() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-lg text-gray-600">Carregando catálogo otimizado...</div>
          </div>
        </div>
      }
    >
      <HomeContentOptimized />
    </Suspense>
  );
}
