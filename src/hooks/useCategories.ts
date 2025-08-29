import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Category, CategoryStats, Product } from "../types";

interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  stats: CategoryStats | null;
  isStatsLoading: boolean;
}

export function useCategories(): UseCategoriesReturn {
  // Query para listar categorias
  const categories = useQuery(api.queries.categories.getCategories);

  // Query para estatísticas das categorias
  const stats = useQuery(api.queries.categories.getCategoryStats);

  return {
    categories: categories || [],
    isLoading: categories === undefined,
    stats: stats || null,
    isStatsLoading: stats === undefined,
  };
}

interface UseCategoryProductsOptions {
  pageSize?: number;
}

interface UseCategoryProductsReturn {
  products: Product[]; // Products from the category
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
}

export function useCategoryProducts(
  categoryName: string | undefined,
  options: UseCategoryProductsOptions = {}
): UseCategoryProductsReturn {
  const { pageSize = 50 } = options;

  // Query para produtos da categoria
  const productsData = useQuery(
    api.queries.categories.getProductsByCategory,
    categoryName
      ? {
          categoryName,
          limit: pageSize,
          offset: 0,
        }
      : "skip"
  );

  const loadMore = () => {
    // TODO: Implementar paginação com cursor
    // Por enquanto, apenas um placeholder
  };

  return {
    products: productsData?.products || [],
    isLoading: productsData === undefined && categoryName !== undefined,
    hasMore: productsData?.hasMore || false,
    totalCount: productsData?.total || 0,
    loadMore,
  };
}
