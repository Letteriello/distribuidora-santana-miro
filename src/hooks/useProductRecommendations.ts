import { useMemo } from "react";
import { useProductsAPI } from "./useProductsAPI";
import type { Product } from "../types";
import type { CartItem } from "@/stores/cartStore";

interface UseProductRecommendationsProps {
  cartItems: CartItem[];
  maxRecommendations?: number;
}

interface ProductWithScore {
  product: Product;
  score: number;
}

export function useProductRecommendations({
  cartItems,
  maxRecommendations = 4,
}: UseProductRecommendationsProps) {
  // Estados removidos pois não são utilizados no momento
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  // Buscar todos os produtos usando useProductsAPI
  const {
    products: allProducts,
    isLoading: productsLoading,
    error: productsError,
  } = useProductsAPI();

  const recommendations = useMemo(() => {
    if (!allProducts || allProducts.length === 0 || cartItems.length === 0) {
      return [];
    }

    try {
      // Extrair categorias e marcas dos produtos no carrinho
      const cartCategories = new Set(cartItems.map((item) => item.product.category));
      const cartBrands = new Set(cartItems.map((item) => item.product.brand));
      const cartPriceRange = {
        min: Math.min(...cartItems.map((item) => item.product.price)),
        max: Math.max(...cartItems.map((item) => item.product.price)),
      };

      // IDs dos produtos já no carrinho (usar externalId que é string)
      const cartProductIds = new Set(cartItems.map((item) => item.product.externalId));

      // Filtrar produtos disponíveis (não no carrinho e com estoque)
      const availableProducts = allProducts.filter(
        (product: Product) =>
          !cartProductIds.has(product.externalId) &&
          product.availableQuantity > 0 &&
          product.isActive
      );

      // Calcular pontuação para cada produto
      const scoredProducts = availableProducts.map((product: Product) => {
        let score = 0;

        // Pontuação por categoria (peso: 40%)
        if (cartCategories.has(product.category)) {
          score += 40;
        }

        // Pontuação por marca (peso: 30%)
        if (cartBrands.has(product.brand)) {
          score += 30;
        }

        // Pontuação por faixa de preço similar (peso: 20%)
        const productPrice = product.price;
        const priceRange = cartPriceRange.max - cartPriceRange.min;
        const priceDiff = Math.abs(productPrice - (cartPriceRange.min + cartPriceRange.max) / 2);

        if (priceRange === 0) {
          // Se todos os produtos no carrinho têm o mesmo preço
          if (priceDiff <= productPrice * 0.2) {
            // 20% de tolerância
            score += 20;
          }
        } else {
          // Normalizar diferença de preço
          const normalizedPriceDiff = priceDiff / priceRange;
          if (normalizedPriceDiff <= 0.5) {
            score += 20 * (1 - normalizedPriceDiff);
          }
        }

        // Pontuação por popularidade (estoque alto indica produto popular) (peso: 10%)
        const stockScore = Math.min(product.availableQuantity / 100, 1) * 10;
        score += stockScore;

        return {
          product,
          score,
        };
      });

      // Ordenar por pontuação e retornar os melhores
      return scoredProducts
        .sort((a: ProductWithScore, b: ProductWithScore) => b.score - a.score)
        .slice(0, maxRecommendations)
        .map((item: ProductWithScore) => item.product);
    } catch (err) {
      if (DEBUG) console.error("Erro ao calcular recomendações:", err);
      return [];
    }
  }, [allProducts, cartItems, maxRecommendations]);

  return {
    recommendations,
    isLoading: productsLoading,
    error: productsError,
  };
}
