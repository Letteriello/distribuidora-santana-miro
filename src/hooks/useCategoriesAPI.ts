import { useState, useEffect, useCallback } from "react";
import { cacheService, CACHE_NAMESPACES } from "../services/cacheService";
import type { Category, CategoryStats } from "../types";
import type { Id } from "../../convex/_generated/dataModel";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  stats: CategoryStats | null;
  isStatsLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseCategoryProductsOptions {
  pageSize?: number;
}

interface APIProduct {
  cd_tpoprd?: number;
  categoria?: string;
  [key: string]: unknown;
}

interface APICategory {
  cd_tpoprd: number;
  ds_tpoprd?: string;
  [key: string]: unknown;
}

interface UseCategoryProductsReturn {
  products: APIProduct[];
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
  error: string | null;
}

const API_URL = "https://fiscalfacil.com/LojaVirtual/14044/produtos?tamanho_pagina=3000";
const CATEGORIES_API_URL = "https://fiscalfacil.com/LojaVirtual/14044/produtos/categorias";
const CACHE_KEY = "categories_api";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Constantes para retry e timeout
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo
const REQUEST_TIMEOUT = 10000; // 10 segundos

// Função utilitária para retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  initialDelay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        if (DEBUG) console.error(`❌ Falha após ${maxAttempts} tentativas:`, lastError.message);
        throw lastError;
      }

      const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      if (DEBUG)
        console.warn(
          `⚠️ Tentativa ${attempt}/${maxAttempts} falhou, tentando novamente em ${Math.round(delay)}ms:`,
          lastError.message
        );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Função para criar controller de timeout
function createTimeoutController(timeoutMs: number = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeoutId };
}

// Função para buscar produtos da API com retry e timeout
async function fetchProductsFromAPI() {
  return retryWithBackoff(async () => {
    const { controller, timeoutId } = createTimeoutController();

    try {
      const response = await fetch(API_URL, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Erro do servidor (${response.status}): Tente novamente`);
        } else if (response.status === 404) {
          throw new Error("API não encontrada - verifique a URL");
        } else if (response.status === 403) {
          throw new Error("Acesso negado à API");
        } else {
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data.dados || data.produtos || [];
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Timeout: A requisição demorou muito para responder");
        }
        throw error;
      }

      throw new Error("Erro desconhecido ao buscar produtos");
    }
  });
}

// Função para buscar categorias da API específica com retry e timeout
async function fetchCategoriesFromAPI() {
  return retryWithBackoff(async () => {
    const { controller, timeoutId } = createTimeoutController();

    try {
      const response = await fetch(CATEGORIES_API_URL, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Erro do servidor (${response.status}): Tente novamente`);
        } else if (response.status === 404) {
          throw new Error("API de categorias não encontrada");
        } else if (response.status === 403) {
          throw new Error("Acesso negado à API de categorias");
        } else {
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Timeout: A requisição de categorias demorou muito para responder");
        }
        throw error;
      }

      throw new Error("Erro desconhecido ao buscar categorias");
    }
  });
}

// Função para formatar nome da categoria
function formatCategoryName(name: string): string {
  if (!name) return name;

  // Mapeamento de acentos e correções específicas
  const corrections: { [key: string]: string } = {
    aluminio: "Alumínio",
    brinquedos: "Brinquedos",
    "cadeiras e mesas": "Cadeiras e Mesas",
    "cama, mesa e banho": "Cama, Mesa e Banho",
    churrasco: "Churrasco",
    decoração: "Decoração",
    descartavel: "Descartável",
    diversos: "Diversos",
    "eletro e eletronico": "Eletro e Eletrônico",
    "espelhos e quadros": "Espelhos e Quadros",
    ferramentas: "Ferramentas",
    inflavel: "Inflável",
    inox: "Inox",
    limpeza: "Limpeza",
    madeira: "Madeira",
    plastico: "Plástico",
    termico: "Térmico",
    utensilios: "Utensílios",
    vasos: "Vasos",
    vidro: "Vidro",
    mochilas: "Mochilas",
    reutilizar: "Reutilizar",
  };

  const lowerName = name.toLowerCase().trim();
  return corrections[lowerName] || name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// Função para processar categorias da API específica
function processCategoriesFromAPI(
  apiCategories: APICategory[],
  products: APIProduct[]
): Category[] {
  // Filtrar duplicatas da categoria "reutilizar" (manter apenas ID 23)
  const filteredCategories = apiCategories.filter((cat) => {
    if (cat.ds_tpoprd?.toLowerCase() === "reutilizar") {
      return cat.cd_tpoprd === 23;
    }
    return true;
  });

  // Contar produtos por categoria usando cd_tpoprd
  const productCountMap = new Map<number, number>();
  products.forEach((product) => {
    if (product.cd_tpoprd) {
      const count = productCountMap.get(product.cd_tpoprd) || 0;
      productCountMap.set(product.cd_tpoprd, count + 1);
    }
  });

  return filteredCategories.map((cat) => ({
    _id: `cat_${cat.cd_tpoprd}` as Id<"categories">,
    name: formatCategoryName(cat.ds_tpoprd || ""),
    description: `Categoria ${formatCategoryName(cat.ds_tpoprd || "")}`,
    isActive: true,
    productCount: productCountMap.get(cat.cd_tpoprd) || 0,
    _creationTime: Date.now(),
    cd_tpoprd: cat.cd_tpoprd, // Manter o código para filtros
  }));
}

// Função para extrair categorias dos produtos (fallback)
function extractCategoriesFromProducts(products: APIProduct[]): Category[] {
  const categoryMap = new Map<string, { count: number; isActive: boolean }>();

  products.forEach((product) => {
    if (product.categoria && product.categoria.trim()) {
      const categoryName = product.categoria.trim();
      const existing = categoryMap.get(categoryName);

      categoryMap.set(categoryName, {
        count: (existing?.count || 0) + 1,
        isActive: true,
      });
    }
  });

  return Array.from(categoryMap.entries()).map(([name, data]) => ({
    _id: `cat_${name.toLowerCase().replace(/\s+/g, "_")}` as Id<"categories">,
    name: formatCategoryName(name),
    description: `Categoria ${formatCategoryName(name)}`,
    isActive: data.isActive,
    productCount: data.count,
    _creationTime: Date.now(),
  }));
}

// Função para buscar dados em cache mesmo se expirados (fallback)
function getExpiredCachedCategories(): { categories: Category[]; stats: CategoryStats } | null {
  try {
    const cachedData = localStorage.getItem(`cache:${CACHE_KEY}`);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (parsed && parsed.data && parsed.data.categories && parsed.data.stats) {
        if (DEBUG) console.log("📦 Usando dados de categorias em cache expirados como fallback");
        return parsed.data;
      }
    }
  } catch (error) {
    if (DEBUG) console.warn("Erro ao acessar cache expirado de categorias:", error);
  }

  return null;
}

// Função para calcular estatísticas das categorias
function calculateCategoryStats(categories: Category[]): CategoryStats {
  const totalCategories = categories.length;
  const totalProducts = categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0);
  const avgProductsPerCategory = totalCategories > 0 ? totalProducts / totalCategories : 0;

  return {
    totalCategories,
    totalProducts,
    avgProductsPerCategory: Math.round(avgProductsPerCategory * 100) / 100,
    categories: categories.map((cat) => ({
      name: cat.name,
      productCount: cat.productCount || 0,
      percentage:
        totalProducts > 0 ? Math.round(((cat.productCount || 0) / totalProducts) * 100) : 0,
    })),
  };
}

export function useCategoriesAPI(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setIsStatsLoading(true);
    setError(null);

    try {
      // Tentar buscar do cache primeiro
      let cachedData = cacheService.get<{ categories: Category[]; stats: CategoryStats }>(
        CACHE_NAMESPACES.CATEGORIES,
        CACHE_KEY
      );

      if (!cachedData) {
        // Se não há cache válido, buscar da API
        try {
          // Tentar buscar categorias da API específica primeiro
          const [apiCategories, products] = await Promise.all([
            fetchCategoriesFromAPI(),
            fetchProductsFromAPI(),
          ]);

          const processedCategories = processCategoriesFromAPI(apiCategories, products);
          const calculatedStats = calculateCategoryStats(processedCategories);

          cachedData = {
            categories: processedCategories,
            stats: calculatedStats,
          };

          cacheService.set(CACHE_NAMESPACES.CATEGORIES, CACHE_KEY, cachedData, CACHE_TTL);
          if (DEBUG) console.log("✅ Categorias atualizadas da API e salvas no cache");
        } catch (apiError) {
          if (DEBUG)
            console.warn(
              "⚠️ Erro ao buscar categorias da API específica, tentando fallback:",
              apiError
            );

          // Primeiro fallback: tentar usar cache expirado
          cachedData = getExpiredCachedCategories();

          if (cachedData) {
            if (DEBUG)
              console.warn("⚠️ API indisponível, usando dados de categorias em cache expirados");
            setError("Conectividade limitada - dados de categorias podem estar desatualizados");
          } else {
            // Segundo fallback: extrair categorias dos produtos
            try {
              const products = await fetchProductsFromAPI();
              const extractedCategories = extractCategoriesFromProducts(products);
              const calculatedStats = calculateCategoryStats(extractedCategories);

              cachedData = {
                categories: extractedCategories,
                stats: calculatedStats,
              };

              cacheService.set(CACHE_NAMESPACES.CATEGORIES, CACHE_KEY, cachedData, CACHE_TTL);
              if (DEBUG) console.log("🔄 Categorias extraídas dos produtos como fallback");
            } catch {
              throw apiError; // Propagar o erro original da API
            }
          }
        }
      } else {
        if (DEBUG) console.log("📦 Usando dados de categorias do cache válido");
      }

      if (cachedData) {
        setCategories(cachedData.categories);
        setStats(cachedData.stats);
      } else {
        throw new Error("Nenhum dado de categoria disponível - verifique sua conexão");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar categorias";
      setError(errorMessage);
      if (DEBUG) console.error("Erro ao carregar produtos da categoria:", err);

      // Último recurso: tentar usar dados em cache expirados
      const fallbackData = getExpiredCachedCategories();
      if (fallbackData) {
        if (DEBUG) console.log("🔄 Usando dados de categorias em cache expirados como último recurso");
        setCategories(fallbackData.categories);
        setStats(fallbackData.stats);
        setError("Sem conexão - exibindo categorias salvas (podem estar desatualizadas)");
      }
    } finally {
      setIsLoading(false);
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Refetch (recarregar dados da API)
  const refetch = useCallback(() => {
    cacheService.remove(CACHE_NAMESPACES.CATEGORIES, CACHE_KEY); // Limpar cache
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    isLoading,
    stats,
    isStatsLoading,
    error,
    refetch,
  };
}

export function useCategoryProductsAPI(
  categoryId: number | undefined,
  options: UseCategoryProductsOptions = {}
): UseCategoryProductsReturn {
  const { pageSize = 50 } = options;
  const [products, setProducts] = useState<APIProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const loadProducts = useCallback(
    async (page = 0) => {
      if (!categoryId) {
        setProducts([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const allProducts = await fetchProductsFromAPI();

        // Filtrar produtos por categoria usando cd_tpoprd
        const categoryProducts = allProducts.filter(
          (product: APIProduct) => product.cd_tpoprd === categoryId
        );

        // Aplicar paginação
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedProducts = categoryProducts.slice(startIndex, endIndex);

        if (page === 0) {
          setProducts(paginatedProducts);
        } else {
          setProducts((prev) => [...prev, ...paginatedProducts]);
        }

        setCurrentPage(page);
      } catch (err) {
        if (DEBUG) console.error("Erro ao carregar produtos da categoria:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    },
    [categoryId, pageSize]
  );

  const loadMore = useCallback(() => {
    loadProducts(currentPage + 1);
  }, [loadProducts, currentPage]);

  useEffect(() => {
    loadProducts(0);
  }, [loadProducts]);

  // Calcular se há mais produtos
  const hasMore = useCallback(async () => {
    if (!categoryId) return false;

    try {
      const allProducts = await fetchProductsFromAPI();
      const categoryProducts = allProducts.filter(
        (product: APIProduct) => product.cd_tpoprd === categoryId
      );

      return products.length < categoryProducts.length;
    } catch {
      return false;
    }
  }, [categoryId, products.length]);

  const [hasMoreProducts, setHasMoreProducts] = useState(false);

  useEffect(() => {
    hasMore().then(setHasMoreProducts);
  }, [hasMore]);

  return {
    products,
    isLoading,
    hasMore: hasMoreProducts,
    totalCount: products.length, // Aproximação, seria melhor calcular o total real
    loadMore,
    error,
  };
}
