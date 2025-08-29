import React, { memo } from "react";
import { ShoppingCart, Heart, Eye } from "lucide-react";
import LazyImage from "./LazyImage";
import { NormalizedProduct } from "../hooks/useProductsAPIOptimized";
import { cn } from "../lib/utils";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

interface ProductCardOptimizedProps {
  product: NormalizedProduct;
  onAddToCart?: (product: NormalizedProduct) => void;
  onToggleFavorite?: (product: NormalizedProduct) => void;
  onViewDetails?: (product: NormalizedProduct) => void;
  isFavorite?: boolean;
  className?: string;
  showQuickActions?: boolean;
  showStock?: boolean;
}

const ProductCardOptimized: React.FC<ProductCardOptimizedProps> = memo(
  ({
    product,
    onAddToCart,
    onToggleFavorite,
    onViewDetails,
    isFavorite = false,
    className,
    showQuickActions = true,
    showStock = true,
  }) => {
    const isOutOfStock = product.availableQuantity === 0;
    const isLowStock = product.availableQuantity > 0 && product.availableQuantity <= 5;

    const handleAddToCart = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isOutOfStock && onAddToCart) {
        onAddToCart(product);
      }
    };

    const handleToggleFavorite = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onToggleFavorite) {
        onToggleFavorite(product);
      }
    };

    const handleViewDetails = () => {
      if (onViewDetails) {
        onViewDetails(product);
      }
    };

    const formatPrice = (price: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(price);
    };

    const getStockStatus = () => {
      if (isOutOfStock) {
        return { text: "Fora de estoque", color: "text-red-600 bg-red-50" };
      }
      if (isLowStock) {
        return {
          text: `Últimas ${product.availableQuantity} unidades`,
          color: "text-orange-600 bg-orange-50",
        };
      }
      return { text: "Em estoque", color: "text-green-600 bg-green-50" };
    };

    const stockStatus = getStockStatus();

    return (
      <div
        className={cn(
          "group relative bg-white rounded-lg shadow-sm border border-gray-200",
          "hover:shadow-md transition-all duration-200 cursor-pointer",
          "flex flex-col h-full",
          isOutOfStock && "opacity-75",
          className
        )}
        onClick={handleViewDetails}
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          <LazyImage
            src={product.image}
            alt={product.name}
            className="w-full h-full"
            onError={() => { if (DEBUG) console.warn(`Erro ao carregar imagem do produto ${product.name}`); }}
          />

          {/* Overlay com ações rápidas */}
          {showQuickActions && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  onClick={handleToggleFavorite}
                  className={cn(
                    "p-2 rounded-full transition-all duration-200",
                    "bg-white shadow-md hover:shadow-lg",
                    isFavorite ? "text-red-500" : "text-gray-600 hover:text-red-500"
                  )}
                  title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                </button>

                <button
                  onClick={handleViewDetails}
                  className="p-2 rounded-full bg-white shadow-md hover:shadow-lg text-gray-600 hover:text-blue-500 transition-all duration-200"
                  title="Ver detalhes"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Badge de status do estoque */}
          {showStock && (
            <div className="absolute top-2 left-2">
              <span className={cn("px-2 py-1 rounded-full text-xs font-medium", stockStatus.color)}>
                {stockStatus.text}
              </span>
            </div>
          )}

          {/* Badge de desconto (se houver) */}
          {product.originalPrice && product.originalPrice > product.price && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                -
                {Math.round(
                  ((product.originalPrice - product.price) / product.originalPrice) * 100
                )}
                %
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Category */}
          <div className="mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {product.category}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 flex-1">{product.name}</h3>

          {/* Brand */}
          <div className="mb-3">
            <span className="text-sm text-gray-600">{product.brand}</span>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={cn(
              "w-full py-2 px-4 rounded-md font-medium transition-all duration-200",
              "flex items-center justify-center space-x-2",
              isOutOfStock
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md"
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isOutOfStock ? "Indisponível" : "Adicionar ao Carrinho"}</span>
          </button>
        </div>
      </div>
    );
  }
);

ProductCardOptimized.displayName = "ProductCardOptimized";

export default ProductCardOptimized;
