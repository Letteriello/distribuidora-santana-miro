"use client";

import { useState, useEffect, useMemo } from "react";
import { cacheService } from "@/services/cacheService";
import { getCategoryCodeByName } from "@/services/categoryMappingService";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

// Interface para produtos da API externa
interface ExternalProduct {
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
  vl_percdesconto: number;
  ds_caracteristica: string;
  ds_marca: string;
  nm_prd: string;
  ds_obssite: string;
}

export interface Brand {
  name: string;
  productCount: number;
}

const API_URL = "https://fiscalfacil.com/LojaVirtual/14044/produtos?tamanho_pagina=3000";
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
  let lastError: Error = new Error("Erro desconhecido");

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

  throw lastError;
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
async function fetchProductsFromAPI(): Promise<ExternalProduct[]> {
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
      return data.dados || [];
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Timeout: A requisição demorou muito para responder");
        }
        throw error;
      }

      throw new Error("Erro desconhecido ao buscar produtos para marcas");
    }
  });
}

// Função para buscar dados em cache mesmo se expirados (fallback)
function getExpiredCachedBrands(cacheKey: string): Brand[] | null {
  try {
    const cachedData = localStorage.getItem(`cache:brands:${cacheKey}`);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (parsed && parsed.data && Array.isArray(parsed.data)) {
        if (DEBUG) console.log("📦 Usando dados de marcas em cache expirados como fallback");
        return parsed.data;
      }
    }
  } catch (error) {
    if (DEBUG) console.warn("Erro ao acessar cache expirado de marcas:", error);
  }

  return null;
}

export function useBrandsByCategory(categoryFilter?: string) {
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryCode, setCategoryCode] = useState<number | null>(null);

  // Buscar código da categoria quando o filtro muda
  useEffect(() => {
    if (categoryFilter) {
      getCategoryCodeByName(categoryFilter).then(setCategoryCode);
    } else {
      setCategoryCode(null);
    }
  }, [categoryFilter]);

  useEffect(() => {
    const fetchBrands = async () => {
      // Definir cacheKey no escopo da função para estar disponível em todos os blocos
      const cacheKey = categoryFilter ? `brands-${categoryFilter}` : "brands-all";

      try {
        setIsLoading(true);
        setError(null);

        // Tentar buscar do cache primeiro
        const cachedBrands = cacheService.get<Brand[]>("brands", cacheKey);
        if (cachedBrands) {
          setAllBrands(cachedBrands);
          setIsLoading(false);
          return;
        }

        // Buscar produtos da API para extrair marcas
        let products: ExternalProduct[];

        try {
          products = await fetchProductsFromAPI();
          if (DEBUG) console.log("✅ Dados de produtos para marcas atualizados da API");
        } catch (apiError) {
          // Fallback: tentar usar cache expirado
          const expiredBrands = getExpiredCachedBrands(cacheKey);

          if (expiredBrands) {
            if (DEBUG) console.warn("⚠️ API indisponível, usando dados de marcas em cache expirados");
            setAllBrands(expiredBrands);
            setError("Conectividade limitada - dados de marcas podem estar desatualizados");
            setIsLoading(false);
            return;
          } else {
            // Se não há cache expirado, propagar o erro
            throw apiError;
          }
        }

        // Filtrar produtos por categoria usando código da categoria
        const filteredProducts = categoryFilter
          ? products.filter((product) => {
              if (categoryCode) {
                return product.cd_tpoprd === categoryCode;
              }
              // Fallback para comparação de string normalizada
              const normalizedCategory = categoryFilter.toLowerCase().trim();
              const normalizedProductCategory = product.ds_tpoprd.toLowerCase().trim();
              return (
                normalizedProductCategory.includes(normalizedCategory) ||
                normalizedCategory.includes(normalizedProductCategory)
              );
            })
          : products;

        // Extrair marcas únicas com contagem
        const brandCounts = filteredProducts.reduce(
          (acc, product) => {
            const brand = product.ds_marca || "Sem marca";
            acc[brand] = (acc[brand] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        // Converter para array e ordenar por nome
        const brandsArray: Brand[] = Object.entries(brandCounts)
          .map(([name, productCount]) => ({ name, productCount: productCount as number }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setAllBrands(brandsArray);

        // Salvar no cache
        cacheService.set("brands", cacheKey, brandsArray, CACHE_TTL);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao buscar marcas";
        setError(errorMessage);
        if (DEBUG) console.error("❌ Erro ao buscar marcas:", err);

        // Último recurso: tentar usar dados em cache expirados
        const fallbackBrands = getExpiredCachedBrands(cacheKey);
        if (fallbackBrands) {
          if (DEBUG) console.log("🔄 Usando dados de marcas em cache expirados como último recurso");
          setAllBrands(fallbackBrands);
          setError("Sem conexão - exibindo marcas salvas (podem estar desatualizadas)");
        } else {
          setAllBrands([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, [categoryFilter, categoryCode]);

  // Filtrar marcas baseado na categoria
  const brands = useMemo(() => {
    return allBrands;
  }, [allBrands]);

  return {
    brands,
    isLoading,
    error,
  };
}
