"use client";

import { useState, useEffect } from "react";
import { cacheService } from "@/services/cacheService";
import type { ExternalProduct } from "@/types";

export interface Brand {
  name: string;
  productCount: number;
}

const API_URL = "https://fiscalfacil.com/LojaVirtual/14044/produtos?tamanho_pagina=3000";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useBrandsAPI() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Tentar buscar do cache primeiro
        const cachedBrands = cacheService.get<Brand[]>("brands", "all");
        if (cachedBrands) {
          setBrands(cachedBrands);
          setIsLoading(false);
          return;
        }

        // Buscar produtos da API para extrair marcas
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();
        const products: ExternalProduct[] = data.produtos || [];

        // Extrair marcas únicas e contar produtos por marca
        const brandMap = new Map<string, number>();

        products.forEach((product) => {
          if (product.marca && product.marca.trim()) {
            const brandName = product.marca.trim();
            brandMap.set(brandName, (brandMap.get(brandName) || 0) + 1);
          }
        });

        // Converter para array e ordenar por nome
        const brandsArray: Brand[] = Array.from(brandMap.entries())
          .map(([name, productCount]) => ({ name, productCount }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setBrands(brandsArray);

        // Salvar no cache
        cacheService.set("brands", "all", brandsArray, CACHE_TTL);
      } catch (err) {
        if (DEBUG) console.error("Erro ao buscar marcas:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setBrands([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  return {
    brands,
    isLoading,
    error,
  };
}
