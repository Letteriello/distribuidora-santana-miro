import { useState, useEffect, useCallback } from "react";
import { cacheService, CACHE_NAMESPACES } from "../services/cacheService";
// import { getCategoryCodeByName } from "../services/categoryService"; // Removido temporariamente
import { useSearchDebounce, useDebouncedCallback } from "./useDebounce";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";
// Tipos
export interface APIProduct {
  cd_produto: number;
  ds_produto: string;
  vl_produto: number;
  qt_estoque: number;
  ds_marca: string;
  categoria: string;
  cd_tpoprd: number;
  ds_tpoprd: string;
  imagem?: string;
  descricao?: string;
}

export interface NormalizedProduct {
  id: string;
  externalId: string;
  name: string;
  price: number;
  originalPrice?: number;
  availableQuantity: number;
  brand: string;
  category: string;
  cd_tpoprd: number;
  image?: string;
  description?: string;
  isActive: boolean;
}

export interface ProductFilters {
  categories?: string[];
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: "all" | "inStock" | "outOfStock";
  search?: string;
  sortBy?: "name" | "price" | "category";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UseProductsOptimizedOptions {
  initialFilters?: ProductFilters;
  pageSize?: number;
  debounceMs?: number;
  cacheTTL?: number;
  enableVirtualization?: boolean;
}

export interface UseProductsOptimizedReturn {
  products: NormalizedProduct[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;

  // Métodos
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateFilters: (filters: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  searchProducts: (search: string) => void;
}

// Constantes otimizadas
const API_URL = "https://miro.jmvstream.com/api/produtos";
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_CACHE_TTL = 10 * 60 * 1000; // 10 minutos (aumentado)
const REQUEST_TIMEOUT = 30000; // 30 segundos (aumentado para evitar ERR_ABORTED)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo entre tentativas
const CACHE_KEY = "products_paginated";
const STALE_WHILE_REVALIDATE_TTL = 30 * 60 * 1000; // 30 minutos para cache stale

// Função para normalizar produtos
function normalizeProduct(apiProduct: APIProduct): NormalizedProduct {
  return {
    id: `prod_${apiProduct.cd_produto}`,
    externalId: apiProduct.cd_produto.toString(),
    name: apiProduct.ds_produto?.trim() || "Produto sem nome",
    price: Number(apiProduct.vl_produto) || 0,
    availableQuantity: Number(apiProduct.qt_estoque) || 0,
    brand: apiProduct.ds_marca?.trim() || "Sem marca",
    category: apiProduct.categoria?.trim() || apiProduct.ds_tpoprd?.trim() || "Sem categoria",
    cd_tpoprd: apiProduct.cd_tpoprd || 0,
    image: apiProduct.imagem,
    description: apiProduct.descricao,
    isActive: true,
  };
}

// Função de retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Não fazer retry em erros de abort ou HTTP 4xx
      if (
        error instanceof Error &&
        (error.name === "AbortError" ||
          (error.message.includes("HTTP 4") && !error.message.includes("408")))
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        if (DEBUG) console.warn(`Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms:`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Função para buscar produtos com paginação virtual
async function fetchProductsPaginated(
  page: number,
  pageSize: number,
  filters: ProductFilters = {}
): Promise<PaginatedResponse<NormalizedProduct>> {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // Construir query params para filtros
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", pageSize.toString());

      if (filters.category) {
        params.append("category", filters.category);
      }
      if (filters.brand) {
        params.append("brand", filters.brand);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }
      if (filters.minPrice !== undefined) {
        params.append("minPrice", filters.minPrice.toString());
      }
      if (filters.maxPrice !== undefined) {
        params.append("maxPrice", filters.maxPrice.toString());
      }
      if (filters.availability && filters.availability !== "all") {
        params.append("availability", filters.availability);
      }
      if (filters.sortBy) {
        params.append("sortBy", filters.sortBy);
      }
      if (filters.sortOrder) {
        params.append("sortOrder", filters.sortOrder);
      }

      const url = `${API_URL}?${params.toString()}`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const apiProducts: APIProduct[] = data.dados || [];

      // Para simular paginação já que a API não suporta nativamente,
      // vamos implementar paginação client-side otimizada
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedProducts = apiProducts.slice(startIndex, endIndex);

      const normalizedProducts = paginatedProducts.map(normalizeProduct);
      const totalCount = apiProducts.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: normalizedProducts,
        totalCount,
        currentPage: page,
        totalPages,
        hasMore: endIndex < totalCount,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Timeout: Requisição cancelada por demora excessiva");
        }
        throw error;
      }

      throw new Error("Erro desconhecido ao buscar produtos");
    }
  });
}

// Função para gerenciar cache inteligente
function getCacheKey(page: number, pageSize: number, filters: ProductFilters): string {
  const filterKey = JSON.stringify({
    ...filters,
    search: filters.search?.toLowerCase().trim(),
  });
  return `${CACHE_KEY}_${page}_${pageSize}_${btoa(filterKey)}`;
}

function getCachedData(
  cacheKey: string
): { data: PaginatedResponse<NormalizedProduct>; isStale: boolean } | null {
  try {
    const cached = cacheService.get<{
      data: PaginatedResponse<NormalizedProduct>;
      timestamp: number;
    }>(CACHE_NAMESPACES.PRODUCTS, cacheKey);
    if (!cached) return null;

    const now = Date.now();
    const isStale = now - cached.timestamp > DEFAULT_CACHE_TTL;
    const isExpired = now - cached.timestamp > STALE_WHILE_REVALIDATE_TTL;

    if (isExpired) {
      cacheService.remove(CACHE_NAMESPACES.PRODUCTS, cacheKey);
      return null;
    }

    return { data: cached.data, isStale };
  } catch (error) {
    if (DEBUG) console.warn("Erro ao acessar cache:", error);
    return null;
  }
}

function setCachedData(cacheKey: string, data: PaginatedResponse<NormalizedProduct>): void {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    cacheService.set(CACHE_NAMESPACES.PRODUCTS, cacheKey, cacheData, DEFAULT_CACHE_TTL);
  } catch (error) {
    if (DEBUG) console.warn("Erro ao salvar no cache:", error);
  }
}

export function useProductsAPIOptimized(
  options: UseProductsOptimizedOptions = {}
): UseProductsOptimizedReturn {
  const { initialFilters = {}, pageSize = DEFAULT_PAGE_SIZE, debounceMs = 300 } = options;

  // Estados
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  // Debounce otimizado para busca
  const { debouncedValue: debouncedSearch } = useSearchDebounce(filters.search || "", debounceMs);

  // Callback debounced para reset de paginação quando a busca muda
  const { debouncedCallback: resetPaginationOnSearch } = useDebouncedCallback(() => {
    setCurrentPage(0);
    setProducts([]);
  }, debounceMs);

  // Resetar paginação quando a busca debounced muda
  useEffect(() => {
    if (debouncedSearch !== (initialFilters.search || "")) {
      resetPaginationOnSearch();
    }
  }, [debouncedSearch, resetPaginationOnSearch, initialFilters.search]);

  // Função para carregar produtos com cache inteligente
  const loadProducts = useCallback(
    async (page: number = 0, append: boolean = false) => {
      if (page === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const cacheKey = getCacheKey(page, pageSize, { ...filters, search: debouncedSearch });
        const cachedResult = getCachedData(cacheKey);

        // Se temos dados em cache (mesmo que stale), usar primeiro
        if (cachedResult) {
          const { data: cachedResponse, isStale } = cachedResult;

          // Atualizar UI imediatamente com dados em cache
          if (append && page > 0) {
            setProducts((prev) => [...prev, ...cachedResponse.data]);
          } else {
            setProducts(cachedResponse.data);
          }

          setCurrentPage(cachedResponse.currentPage);
          setTotalCount(cachedResponse.totalCount);
          setTotalPages(cachedResponse.totalPages);
          setHasMore(cachedResponse.hasMore);

          if (isStale) {
            if (DEBUG)
              console.log(
                `🔄 Página ${page + 1} carregada do cache (stale) - revalidando em background`
              );
            // Revalidar em background se os dados estão stale
            fetchProductsPaginated(page, pageSize, { ...filters, search: debouncedSearch })
              .then((freshData) => {
                setCachedData(cacheKey, freshData);
                if (DEBUG) console.log(`✅ Página ${page + 1} revalidada e atualizada no cache`);
              })
              .catch((err) => {
                if (DEBUG) console.warn(`⚠️ Falha na revalidação da página ${page + 1}:`, err);
              });
          } else {
            if (DEBUG) console.log(`📦 Página ${page + 1} carregada do cache (fresh)`);
          }
        } else {
          // Não há dados em cache, buscar da API
          const response = await fetchProductsPaginated(page, pageSize, {
            ...filters,
            search: debouncedSearch,
          });

          // Salvar no cache
          setCachedData(cacheKey, response);

          if (DEBUG) console.log(`✅ Página ${page + 1} carregada da API e salva no cache`);

          // Atualizar UI
          if (append && page > 0) {
            setProducts((prev) => [...prev, ...response.data]);
          } else {
            setProducts(response.data);
          }

          setCurrentPage(response.currentPage);
          setTotalCount(response.totalCount);
          setTotalPages(response.totalPages);
          setHasMore(response.hasMore);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao carregar produtos";
        setError(errorMessage);
        if (DEBUG) console.error("❌ Erro ao carregar produtos:", err);

        // Em caso de erro, tentar carregar do cache expirado
        const expiredCacheKey = `${CACHE_KEY}_expired`;
        const expiredData = localStorage.getItem(
          `cache:${CACHE_NAMESPACES.PRODUCTS}:${expiredCacheKey}`
        );

        if (expiredData && page === 0) {
          try {
            const parsed = JSON.parse(expiredData);
            if (parsed.data && Array.isArray(parsed.data.data)) {
              setProducts(parsed.data.data);
              setError("Conectividade limitada - dados podem estar desatualizados");
              if (DEBUG) console.log("🔄 Usando dados em cache expirados como fallback");
            }
          } catch (cacheError) {
            if (DEBUG) console.warn("Erro ao acessar cache expirado:", cacheError);
          }
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters, debouncedSearch, pageSize]
  );

  // Carregar produtos iniciais
  useEffect(() => {
    loadProducts(0, false);
  }, [loadProducts]);

  // Função para carregar mais produtos
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    const nextPage = currentPage + 1;
    await loadProducts(nextPage, true);
  }, [hasMore, isLoadingMore, currentPage, loadProducts]);

  // Função para refresh
  const refresh = useCallback(async () => {
    setCurrentPage(0);
    setProducts([]);
    await loadProducts(0, false);
  }, [loadProducts]);

  // Atualizar filtros
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(0);
    setProducts([]);
  }, []);

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(0);
    setProducts([]);
  }, []);

  // Buscar produtos
  const searchProducts = useCallback(
    (search: string) => {
      updateFilters({ search });
    },
    [updateFilters]
  );

  return {
    products,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    currentPage,
    totalPages,
    loadMore,
    refresh,
    updateFilters,
    clearFilters,
    searchProducts,
  };
}
