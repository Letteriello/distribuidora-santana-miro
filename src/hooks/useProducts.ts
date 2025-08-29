import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { ProductFilters as ProductFiltersType, UseProductsReturn } from "../types";
import { debounce } from "../lib/utils";

type ProductFilters = ProductFiltersType;

interface UseProductsOptions {
  initialFilters?: Partial<ProductFilters>;
  debounceMs?: number;
  pageSize?: number;
  currentPage?: number;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const {
    initialFilters = {},
    debounceMs = 300,
    pageSize = 200,
    currentPage: externalCurrentPage,
  } = options;

  // Estados locais
  const [filters, setFilters] = useState<ProductFilters>({
    categories: [],
    minPrice: undefined,
    maxPrice: undefined,
    availability: "all",
    search: "",
    sortBy: "name",
    sortOrder: "asc",
    ...initialFilters,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [internalCurrentPage, setInternalCurrentPage] = useState(0);

  // Use external currentPage if provided, otherwise use internal
  const currentPage =
    externalCurrentPage !== undefined ? externalCurrentPage - 1 : internalCurrentPage;

  // Debounce para busca
  const debouncedSetSearch = useMemo(
    () =>
      debounce((search: string) => {
        setDebouncedSearch(search);
        if (externalCurrentPage === undefined) {
          setInternalCurrentPage(0); // Reset página ao buscar apenas se usando paginação interna
        }
      }, debounceMs),
    [debounceMs, externalCurrentPage]
  );

  // Atualizar busca com debounce
  useEffect(() => {
    debouncedSetSearch(filters.search || "");
  }, [filters.search, debouncedSetSearch]);

  // Query para produtos
  const productsData = useQuery(api.queries.products.getProducts, {
    search: debouncedSearch,
    category: filters.category || undefined,
    brand: filters.brand,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    limit: pageSize,
    offset: currentPage * pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // Query para produtos em destaque
  const featuredProducts = useQuery(api.queries.products.getFeaturedProducts, {
    limit: 8,
  });

  // Atualizar filtros
  const updateFilters = useCallback(
    (newFilters: Partial<ProductFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      if (externalCurrentPage === undefined) {
        setInternalCurrentPage(0);
      }
    },
    [externalCurrentPage]
  );

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters({
      categories: [],
      minPrice: undefined,
      maxPrice: undefined,
      availability: "all",
      search: "",
      sortBy: "name",
      sortOrder: "asc",
    });
    if (externalCurrentPage === undefined) {
      setInternalCurrentPage(0);
    }
  }, [externalCurrentPage]);

  // Buscar por texto
  const searchProducts = useCallback(
    (search: string) => {
      updateFilters({ search });
    },
    [updateFilters]
  );

  // Filtrar por categoria
  const filterByCategory = useCallback(
    (category: string) => {
      updateFilters({ categories: [category] });
    },
    [updateFilters]
  );

  // Filtrar por preço
  const filterByPrice = useCallback(
    (minPrice?: number, maxPrice?: number) => {
      updateFilters({ minPrice, maxPrice });
    },
    [updateFilters]
  );

  // Filtrar por disponibilidade
  const filterByAvailability = useCallback(
    (availability: "all" | "inStock" | "outOfStock") => {
      updateFilters({ availability });
    },
    [updateFilters]
  );

  // Ordenar produtos
  const sortProducts = useCallback(
    (sortBy: ProductFilters["sortBy"], sortOrder: ProductFilters["sortOrder"]) => {
      updateFilters({ sortBy, sortOrder });
    },
    [updateFilters]
  );

  // Carregar mais produtos (pagination)
  const loadMore = useCallback(() => {
    if (productsData?.hasMore && externalCurrentPage === undefined) {
      setInternalCurrentPage((prev) => prev + 1);
    }
  }, [productsData?.hasMore, externalCurrentPage]);

  return {
    products: productsData?.products || [],
    featuredProducts: featuredProducts || [],
    isLoading: productsData === undefined,
    error: null, // TODO: Implementar tratamento de erro
    hasMore: productsData?.hasMore || false,
    totalCount: productsData?.total || 0,

    // Métodos de filtro e controle
    updateFilters,
    clearFilters,
    searchProducts,
    filterByCategory,
    filterByPrice,
    filterByAvailability,
    sortProducts,
    loadMore,
    refetch: () => {}, // Placeholder para refetch
  };
}

// Hook específico para um produto
export function useProduct(productId: Id<"products"> | undefined) {
  const product = useQuery(api.queries.products.getProduct, productId ? { id: productId } : "skip");

  return {
    product: product || null,
    isLoading: product === undefined && productId !== undefined,
    error: null,
  };
}

// Hook para buscar produto por ID externo
export function useProductByExternalId(externalId: string | undefined) {
  const product = useQuery(
    api.queries.products.getProductByExternalId,
    externalId ? { externalId } : "skip"
  );

  return {
    product: product || null,
    isLoading: product === undefined && externalId !== undefined,
    error: null,
  };
}
