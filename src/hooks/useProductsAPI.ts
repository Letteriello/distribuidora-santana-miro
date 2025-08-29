import { useState, useCallback, useMemo, useEffect } from "react";
import { ProductFilters as ProductFiltersType, UseProductsReturn, Product } from "../types";
import { debounce } from "../lib/utils";
import { cacheService, CACHE_NAMESPACES } from "../services/cacheService";
import { getCategoryCodeByName } from "../services/categoryMappingService";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";
type ProductFilters = ProductFiltersType;

// Interface para estoque
interface APIEstoque {
  [key: string]: unknown;
}

// Tipos para a API externa
interface ExternalAPIProduct {
  cd_prd: number;
  cd_un: string;
  ds_temfoto: string;
  ds_promocao: string;
  controlaestoque: number;
  vl_promocao: number;
  ds_imagem: string;
  vl_vnd: number;
  qt_prd: number;
  qt_disponivel: number;
  cd_tpoprd: number;
  ds_tpoprd: string;
  nr_prioridade: number;
  estoques: APIEstoque[];
  vl_percdesconto: number;
  ds_caracteristica: string;
  ds_marca: string;
  nm_prd: string;
  ds_obssite: string;
}

interface ExternalAPIResponse {
  dados: ExternalAPIProduct[];
}

// Tipo para produto normalizado
interface NormalizedProduct {
  _id: string;
  externalId: string;
  name: string;
  image: string;
  price: number;
  availableQuantity: number;
  category: string;
  brand: string;
  unit: string;
  description?: string;
  isActive: boolean;
  lastSyncAt: number;
  cd_tpoprd?: number; // Código da categoria da API externa
}

// Constantes para cache e retry
const API_URL = "https://fiscalfacil.com/LojaVirtual/14044/produtos?tamanho_pagina=3000";
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const PRODUCTS_CACHE_KEY = "all_products";
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo
const REQUEST_TIMEOUT = 10000; // 10 segundos

interface UseProductsOptions {
  initialFilters?: Partial<ProductFilters>;
  debounceMs?: number;
  pageSize?: number;
  currentPage?: number;
  cacheTTL?: number; // TTL em milissegundos
}

// Função para normalizar produtos da API externa
function normalizeProduct(apiProduct: ExternalAPIProduct): NormalizedProduct {
  return {
    _id: `api_${apiProduct.cd_prd}`,
    externalId: apiProduct.cd_prd.toString(),
    name: apiProduct.nm_prd,
    image: apiProduct.ds_imagem,
    price: apiProduct.vl_vnd,
    availableQuantity: apiProduct.qt_disponivel,
    category: apiProduct.ds_tpoprd,
    brand: apiProduct.ds_marca || "Sem marca",
    unit: apiProduct.cd_un,
    description: apiProduct.ds_caracteristica || apiProduct.ds_obssite,
    isActive: apiProduct.qt_disponivel > 0,
    lastSyncAt: Date.now(),
    cd_tpoprd: apiProduct.cd_tpoprd, // Código da categoria da API externa
  };
}

// Função utilitária para retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  initialDelay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error = new Error("Erro desconhecido");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Log detalhado do erro para debug
      if (DEBUG)
        console.warn(`Tentativa ${attempt}/${maxAttempts} falhou:`, {
          error: lastError.message,
          url: API_URL,
          attempt,
          willRetry: attempt < maxAttempts,
        });

      // Se é a última tentativa, não esperar
      if (attempt === maxAttempts) {
        break;
      }

      // Calcular delay com backoff exponencial + jitter
      const delay = initialDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.1 * delay; // 10% de jitter
      const totalDelay = delay + jitter;

      if (DEBUG) console.log(`Aguardando ${Math.round(totalDelay)}ms antes da próxima tentativa...`);
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

// Função para criar AbortController com timeout
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // Limpar timeout se a requisição completar antes
  const originalSignal = controller.signal;
  const cleanup = () => clearTimeout(timeoutId);
  originalSignal.addEventListener("abort", cleanup, { once: true });

  return controller;
}

// Função para buscar dados da API com retry e timeout
async function fetchProductsFromAPI(): Promise<NormalizedProduct[]> {
  return retryWithBackoff(async () => {
    const controller = createTimeoutController(REQUEST_TIMEOUT);

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        // Diferentes tipos de erro HTTP para melhor tratamento
        if (response.status >= 500) {
          throw new Error(`Erro do servidor (${response.status}): ${response.statusText}`);
        } else if (response.status === 404) {
          throw new Error(`Endpoint não encontrado (404): ${API_URL}`);
        } else if (response.status === 403) {
          throw new Error(`Acesso negado (403): Verifique as permissões`);
        } else {
          throw new Error(`Erro HTTP (${response.status}): ${response.statusText}`);
        }
      }

      const data: ExternalAPIResponse = await response.json();

      if (!data || !Array.isArray(data.dados)) {
        throw new Error("Formato de resposta inválido da API");
      }

      if (DEBUG) console.log(`✅ Produtos carregados com sucesso: ${data.dados.length} itens`);
      return data.dados.map(normalizeProduct);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Timeout na requisição (${REQUEST_TIMEOUT}ms): ${API_URL}`);
        }
        throw error;
      }
      throw new Error(`Erro desconhecido: ${String(error)}`);
    }
  });
}

// Função para gerenciar cache usando o serviço
function getCachedProducts(): NormalizedProduct[] | null {
  return cacheService.get<NormalizedProduct[]>(CACHE_NAMESPACES.PRODUCTS, PRODUCTS_CACHE_KEY);
}

// Função para buscar dados em cache mesmo se expirados (fallback)
function getExpiredCachedProducts(): NormalizedProduct[] | null {
  try {
    const cacheKey = `${CACHE_NAMESPACES.PRODUCTS}:${PRODUCTS_CACHE_KEY}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (parsed && parsed.data && Array.isArray(parsed.data)) {
        if (DEBUG) console.log("📦 Usando dados em cache expirados como fallback");
        return parsed.data;
      }
    }
  } catch (error) {
    if (DEBUG) console.warn("Erro ao acessar cache expirado:", error);
  }

  return null;
}

function setCachedProducts(products: NormalizedProduct[], cacheTTL: number): void {
  cacheService.set(CACHE_NAMESPACES.PRODUCTS, PRODUCTS_CACHE_KEY, products, cacheTTL);
}

export function useProductsAPI(options: UseProductsOptions = {}): UseProductsReturn {
  const {
    initialFilters = {},
    debounceMs = 300,
    pageSize = 200,
    currentPage: externalCurrentPage,
    cacheTTL = DEFAULT_CACHE_TTL,
  } = options;

  // Estados locais
  const [filters, setFilters] = useState<ProductFilters>({
    categories: [],
    category: undefined,
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
  const [allProducts, setAllProducts] = useState<NormalizedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryCode, setCategoryCode] = useState<number | null>(null);

  // Use external currentPage if provided, otherwise use internal
  const currentPage =
    externalCurrentPage !== undefined ? externalCurrentPage - 1 : internalCurrentPage;

  // Debounce para busca
  const debouncedSetSearch = useMemo(
    () =>
      debounce((search: string) => {
        setDebouncedSearch(search);
        if (externalCurrentPage === undefined) {
          setInternalCurrentPage(0);
        }
      }, debounceMs),
    [debounceMs, externalCurrentPage]
  );

  // Atualizar busca com debounce
  useEffect(() => {
    debouncedSetSearch(filters.search || "");
  }, [filters.search, debouncedSetSearch]);

  // Sincronizar filtros quando initialFilters mudar
  const initialFiltersString = JSON.stringify(initialFilters);
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters((prev) => ({
        ...prev,
        ...initialFilters,
      }));
    }
  }, [initialFilters, initialFiltersString]);

  // Buscar código da categoria quando o filtro de categoria mudar
  useEffect(() => {
    if (filters.category) {
      getCategoryCodeByName(filters.category).then((code) => {
        setCategoryCode(code);
        if (code) {
          if (DEBUG) console.log(`Categoria "${filters.category}" mapeada para código: ${code}`);
        } else {
          if (DEBUG) console.warn(`Código não encontrado para categoria: ${filters.category}`);
        }
      });
    } else {
      setCategoryCode(null);
    }
  }, [filters.category]);

  // Carregar produtos da API
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Tentar buscar do cache primeiro
      let products = getCachedProducts();

      if (!products) {
        // Se não há cache válido, buscar da API
        try {
          products = await fetchProductsFromAPI();
          setCachedProducts(products, cacheTTL);
          if (DEBUG) console.log("✅ Dados atualizados da API e salvos no cache");
        } catch (apiError) {
          // Fallback: tentar usar cache expirado
          products = getExpiredCachedProducts();

          if (products) {
            if (DEBUG) console.warn("⚠️ API indisponível, usando dados em cache expirados");
            setError("Conectividade limitada - dados podem estar desatualizados");
          } else {
            // Se não há nem cache expirado, propagar o erro
            throw apiError;
          }
        }
      } else {
        if (DEBUG) console.log("📦 Usando dados do cache válido");
      }

      if (products) {
        setAllProducts(products);
      } else {
        throw new Error("Nenhum dado disponível - verifique sua conexão");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar produtos";
      setError(errorMessage);
      if (DEBUG) console.error("❌ Erro ao carregar produtos:", err);

      // Tentar usar dados em cache expirados como último recurso
      const fallbackProducts = getExpiredCachedProducts();
      if (fallbackProducts) {
        if (DEBUG) console.log("🔄 Usando dados em cache expirados como último recurso");
        setAllProducts(fallbackProducts);
        setError("Sem conexão - exibindo dados salvos (podem estar desatualizados)");
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheTTL]);

  // Carregar produtos na inicialização
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filtrar e ordenar produtos
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Filtro por categoria usando cd_tpoprd para maior precisão
    if (filters.category) {
      if (categoryCode) {
        // Filtrar usando o código da categoria (cd_tpoprd) para máxima precisão
        filtered = filtered.filter((p) => {
          return p.cd_tpoprd === categoryCode;
        });
        if (DEBUG)
          console.log(
            `Filtro por categoria "${filters.category}" (código: ${categoryCode}) - ${filtered.length} produtos encontrados`
          );
      } else {
        // Fallback para comparação de string quando não há código
        const normalizeForComparison = (str: string) => {
          return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
        };

        const filterCategory = normalizeForComparison(filters.category);
        filtered = filtered.filter((p) => {
          const productCategory = normalizeForComparison(p.category);
          return productCategory === filterCategory;
        });
        if (DEBUG)
          console.log(
            `Filtro por categoria "${filters.category}" (fallback string) - ${filtered.length} produtos encontrados`
          );
      }
    }

    // Filtro por marca
    if (filters.brand) {
      filtered = filtered.filter((p) => p.brand && p.brand.trim() === filters.brand?.trim());
    }

    // Filtro por busca
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          p.brand.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por preço
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
    }

    // Filtro por disponibilidade
    if (filters.availability === "inStock") {
      filtered = filtered.filter((p) => p.availableQuantity > 0);
    } else if (filters.availability === "outOfStock") {
      filtered = filtered.filter((p) => p.availableQuantity === 0);
    }

    // Ordenação
    const sortBy = filters.sortBy || "name";
    const sortOrder = filters.sortOrder || "asc";

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "price":
          aValue = a.price;
          bValue = b.price;
          break;
        case "category":
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? comparison : -comparison;
      } else {
        const comparison = (aValue as number) - (bValue as number);
        return sortOrder === "asc" ? comparison : -comparison;
      }
    });

    return filtered;
  }, [allProducts, filters, debouncedSearch, categoryCode]);

  // Paginação
  const paginatedProducts = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, pageSize]);

  // Produtos em destaque (primeiros 8 produtos ativos)
  const featuredProducts = useMemo(() => {
    return allProducts.filter((p) => p.isActive).slice(0, 8);
  }, [allProducts]);

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
      category: undefined,
      brand: undefined,
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
    const hasMore = (currentPage + 1) * pageSize < filteredProducts.length;
    if (hasMore && externalCurrentPage === undefined) {
      setInternalCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, pageSize, filteredProducts.length, externalCurrentPage]);

  // Refetch (recarregar dados da API)
  const refetch = useCallback(() => {
    cacheService.remove(CACHE_NAMESPACES.PRODUCTS, PRODUCTS_CACHE_KEY); // Limpar cache
    loadProducts();
  }, [loadProducts]);

  return {
    products: paginatedProducts as Product[], // Cast para compatibilidade com tipos existentes
    featuredProducts: featuredProducts as Product[],
    isLoading,
    error,
    hasMore: (currentPage + 1) * pageSize < filteredProducts.length,
    totalCount: filteredProducts.length,

    // Métodos de filtro e controle
    updateFilters,
    clearFilters,
    searchProducts,
    filterByCategory,
    filterByPrice,
    filterByAvailability,
    sortProducts,
    loadMore,
    refetch,
  };
}

// Hook para buscar produto específico por ID externo
export function useProductByExternalIdAPI(externalId: string | undefined) {
  const [product, setProduct] = useState<NormalizedProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!externalId) {
      setProduct(null);
      return;
    }

    const loadProduct = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Tentar buscar do cache primeiro
        let products = getCachedProducts();

        if (!products) {
          // Se não há cache válido, buscar da API
          products = await fetchProductsFromAPI();
          setCachedProducts(products, DEFAULT_CACHE_TTL);
        }

        const foundProduct = products.find((p) => p.externalId === externalId);
        setProduct(foundProduct || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar produto");
        if (DEBUG) console.error("Erro ao carregar produto:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [externalId]);

  return {
    product,
    isLoading,
    error,
  };
}
