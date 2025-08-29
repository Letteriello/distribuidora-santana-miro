"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, AlertCircle, Check, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useCartActions } from "../../stores/cartStore";
import ProductImage from "./ProductImage";
import type { Product } from "../../types";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCartActions();
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleAddToCart = () => {
    if (quantity <= 0) {
      return;
    }

    startTransition(async () => {
      try {
        // Converter externalId para Product object
        const productData: Product = {
          _id: product._id,
          externalId: product.externalId,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          availableQuantity: product.availableQuantity,
          isActive: product.isActive,
          image: product.image,
          unit: product.unit,
          lastSyncAt: product.lastSyncAt,
        };

        await addToCart(productData, quantity);
        toast.success(
          `${quantity} ${quantity === 1 ? "item adicionado" : "itens adicionados"} ao carrinho!`
        );
        setQuantity(1); // Reset quantity after adding
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao adicionar produto ao carrinho"
        );
      }
    });
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= product.availableQuantity) {
      setQuantity(newQuantity);
    }
  };

  const incrementQuantity = () => {
    if (quantity < product.availableQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const isOutOfStock = product.availableQuantity <= 0;
  const isLowStock = product.availableQuantity <= 5 && product.availableQuantity > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="w-full h-full hover:scale-105 transition-transform duration-300"
          fallbackClassName="w-full h-full"
        />

        {/* Stock Status Badge - Only Out of Stock on image */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs sm:text-sm px-2 py-1 rounded-full font-medium shadow-sm">
            Esgotado
          </div>
        )}

        {/* Category Badge */}
        {product.category && (
          <div className="absolute top-2 right-2 bg-primary-100 text-primary-700 text-xs sm:text-sm px-2 py-1 rounded-full font-medium shadow-sm">
            {product.category}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {/* Low Stock Warning */}
        {isLowStock && (
          <div className="mb-2 inline-block">
            <span className="bg-yellow-500 text-white text-xs sm:text-sm px-2 py-1 rounded-full font-medium shadow-sm">
              Últimas unidades
            </span>
          </div>
        )}

        {/* Brand and External ID */}
        <div className="mb-3 space-y-1">
          {product.brand && (
            <p className="text-xs sm:text-sm font-medium text-gray-700">{product.brand}</p>
          )}
          <p className="text-xs sm:text-sm text-gray-500">Código: {product.externalId}</p>
        </div>

        {/* Price and Quantity Controls */}
        <div className="mb-4 space-y-3">
          <div className="mb-3">
            <p className="text-lg sm:text-xl font-semibold text-gray-900">
              {formatPrice(product.price)}
            </p>
          </div>

          {/* Quantity Controls */}
          {!isOutOfStock && (
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-4">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 border-primary-400 bg-primary-50 hover:bg-primary-100 hover:border-primary-500 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200 shadow-sm touch-manipulation"
              >
                <Minus className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </button>
              <input
                type="number"
                min="1"
                max={product.availableQuantity}
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  handleQuantityChange(value);
                }}
                className="w-16 sm:w-20 text-center border-2 border-primary-300 rounded-md px-2 py-2 sm:py-3 text-sm sm:text-base font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm touch-manipulation"
              />
              <button
                onClick={incrementQuantity}
                disabled={quantity >= product.availableQuantity}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 border-primary-400 bg-primary-50 hover:bg-primary-100 hover:border-primary-500 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200 shadow-sm touch-manipulation"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </button>
            </div>
          )}
          {!isOutOfStock && quantity > 1 && (
            <p className="text-sm sm:text-base text-gray-600 font-medium text-center">
              Total: {formatPrice(product.price * quantity)}
            </p>
          )}
        </div>

        {/* Stock Info */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-2">
            {isOutOfStock ? (
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            ) : isLowStock ? (
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            ) : (
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            )}
            <span
              className={`text-xs sm:text-sm font-medium ${
                isOutOfStock ? "text-red-600" : isLowStock ? "text-yellow-600" : "text-green-600"
              }`}
            >
              {isOutOfStock ? "Indisponível" : `${product.availableQuantity} em estoque`}
            </span>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isPending}
          className={`w-full flex items-center justify-center space-x-2 py-3 sm:py-4 px-4 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 touch-manipulation ${
            isOutOfStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white hover:shadow-md active:scale-95"
          }`}
        >
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
              <span>Adicionando...</span>
            </>
          ) : isOutOfStock ? (
            <>
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Indisponível</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Adicionar ao Carrinho</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
