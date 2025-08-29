"use client";

import React from "react";
import Image from "next/image";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useProductRecommendations } from "../../hooks/useProductRecommendations";
import { useCartActions } from "../../stores/cartStore";
import { formatPrice } from "../../lib/utils";
import type { Product } from "../../types";
import type { CartItem } from "@/stores/cartStore";

interface ProductRecommendationsProps {
  cartItems: CartItem[];
  currentAmount?: number;
  className?: string;
}

interface RecommendationItemProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isAdding: boolean;
}

function RecommendationItem({ product, onAddToCart, isAdding }: RecommendationItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
      {/* Imagem do produto */}
      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
        {product.image && product.image !== "/placeholder-product.jpg" ? (
          <Image
            src={product.image}
            alt={product.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={`w-8 h-8 text-gray-400 ${product.image && product.image !== "/placeholder-product.jpg" ? "hidden" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z" />
          </svg>
        </div>
      </div>

      {/* Informações do produto */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-green-600">{formatPrice(product.price)}</span>
          {product.brand && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              {product.brand}
            </Badge>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">{product.availableQuantity} em estoque</div>
      </div>

      {/* Botão adicionar */}
      <Button
        size="sm"
        onClick={() => onAddToCart(product)}
        disabled={isAdding}
        className="flex-shrink-0 h-8 w-8 p-0"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function ProductRecommendations({
  cartItems,
  currentAmount = 0,
  className,
}: ProductRecommendationsProps) {
  const { recommendations, isLoading, error } = useProductRecommendations({
    cartItems,
    maxRecommendations: 4,
  });
  const { addToCart } = useCartActions();
  const [addingProducts, setAddingProducts] = React.useState<Set<string>>(new Set());

  const handleAddToCart = async (product: Product) => {
    setAddingProducts((prev) => new Set(prev).add(product.externalId));

    try {
      await addToCart(product, 1);

      toast.success(`${product.name} adicionado ao carrinho!`);
    } catch (error) {
      if (DEBUG) console.error("Erro ao adicionar produto ao carrinho:", error);
      toast.error("Erro ao adicionar produto ao carrinho");
    } finally {
      setAddingProducts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(product.externalId);
        return newSet;
      });
    }
  };

  // Não exibir se não há itens no carrinho ou se está carregando
  if (cartItems.length === 0 || isLoading) {
    return null;
  }

  // Não exibir se houve erro ou não há recomendações
  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <span>Produtos Recomendados</span>
        </CardTitle>
        <p className="text-sm text-gray-600">Baseado nos itens do seu carrinho</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {recommendations.map((product) => (
          <RecommendationItem
            key={product.externalId}
            product={product}
            onAddToCart={handleAddToCart}
            isAdding={addingProducts.has(product.externalId)}
          />
        ))}

        {/* Incentivo gamificado baseado no progresso */}
        {cartItems.length > 0 &&
          (() => {
            const remaining = Math.max(500 - currentAmount, 0);
            const progress = (currentAmount / 500) * 100;

            if (currentAmount >= 500) {
              return (
                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      🎉 Desconto Desbloqueado!
                    </span>
                  </div>
                  <p className="text-xs text-green-700">
                    Continue adicionando produtos para maximizar suas economias!
                  </p>
                </div>
              );
            }

            if (progress > 75) {
              return (
                <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">🔥 Quase lá!</span>
                  </div>
                  <p className="text-xs text-orange-700">
                    Faltam apenas {formatPrice(remaining)} para desbloquear até 35% de desconto!
                  </p>
                </div>
              );
            }

            if (progress > 50) {
              return (
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">💪 No caminho certo!</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Adicione {formatPrice(remaining)} e ganhe até 35% de desconto no PIX!
                  </p>
                </div>
              );
            }

            return (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    🎯 Desbloqueie os descontos!
                  </span>
                </div>
                <p className="text-xs text-purple-700">
                  Adicione {formatPrice(remaining)} e ganhe até 35% OFF (PIX) ou 30% OFF (Cartão)!
                </p>
              </div>
            );
          })()}
      </CardContent>
    </Card>
  );
}
