"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartActions } from "../../stores/cartStore";
import ProductImage from "@/components/product/ProductImage";
import type { CartItem } from "@/stores/cartStore";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

interface CartItemProps {
  item: CartItem;
  onQuantityChange?: (productId: string, quantity: number) => void;
  onRemove?: (productId: string) => void;
  isUpdating?: boolean;
}

export default function CartItem({
  item,
  onQuantityChange,
  onRemove,
  isUpdating = false,
}: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCartActions();
  const [localQuantity, setLocalQuantity] = useState(item.quantity);
  const [isLocalUpdating, setIsLocalUpdating] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;

    setLocalQuantity(newQuantity);
    setIsLocalUpdating(true);

    try {
      if (onQuantityChange) {
        onQuantityChange(item.product.externalId, newQuantity);
      } else {
        await updateQuantity(item.product.externalId, newQuantity);
      }
    } catch (error) {
      // Revert on error
      setLocalQuantity(item.quantity);
      if (DEBUG) console.error("Erro ao atualizar quantidade:", error);
    } finally {
      setIsLocalUpdating(false);
    }
  };

  const handleRemove = async () => {
    setIsLocalUpdating(true);

    try {
      if (onRemove) {
        onRemove(item.product.externalId);
      } else {
        await removeFromCart(item.product.externalId);
      }
    } catch (error) {
      if (DEBUG) console.error("Erro ao remover item:", error);
      setIsLocalUpdating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const itemTotal = item.product.price * localQuantity;
  const isItemUpdating = isUpdating || isLocalUpdating;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-4 mb-4 ${
        isItemUpdating ? "opacity-50" : "opacity-100"
      }`}
    >
      <div className="flex items-start space-x-4 sm:space-x-4">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <ProductImage
            src="/placeholder-product.jpg"
            alt={item.product.name}
            className="w-20 h-20 sm:w-20 sm:h-20 rounded-lg object-cover border border-gray-100"
            fallbackClassName="w-20 h-20 sm:w-20 sm:h-20 rounded-lg border border-gray-100"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2">
              <h3 className="text-base sm:text-base font-semibold text-gray-900 leading-tight mb-2 sm:mb-1">
                {item.product.name}
              </h3>

              <p className="text-sm sm:text-sm text-gray-500 mb-3 sm:mb-2">
                Código: {item.product.externalId}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                <span className="text-lg sm:text-lg font-bold text-primary-600">
                  {formatPrice(item.product.price)}
                </span>

                {/* Stock warning */}
                {item.product.availableQuantity <= 5 && item.product.availableQuantity > 0 && (
                  <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full font-medium inline-block w-fit">
                    Últimas {item.product.availableQuantity} unidades
                  </span>
                )}
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={handleRemove}
              disabled={isItemUpdating}
              className="p-2 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center"
              title="Remover item"
            >
              <Trash2 className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quantity Controls and Total */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-100 space-y-4 sm:space-y-0">
        {/* Quantity Controls */}
        <div className="flex items-center space-x-3 sm:space-x-3">
          <span className="text-sm sm:text-sm font-medium text-gray-700">Qtd:</span>
          <div className="flex items-center bg-primary-50 rounded-lg border border-primary-200">
            <button
              onClick={() => handleQuantityChange(localQuantity - 1)}
              disabled={localQuantity <= 1 || isItemUpdating}
              className="p-3 sm:p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-100 active:bg-primary-200 disabled:opacity-75 disabled:cursor-not-allowed rounded-l-lg transition-all duration-200 min-h-[44px] sm:min-h-auto flex items-center justify-center"
            >
              <Minus className="h-4 w-4 sm:h-4 sm:w-4" />
            </button>

            <span className="px-4 sm:px-4 py-3 sm:py-2 text-base sm:text-base font-bold text-gray-800 bg-white border-x border-primary-200 min-w-[60px] sm:min-w-[60px] text-center min-h-[44px] sm:min-h-auto flex items-center justify-center">
              {localQuantity}
            </span>

            <button
              onClick={() => handleQuantityChange(localQuantity + 1)}
              disabled={localQuantity >= item.product.availableQuantity || isItemUpdating}
              className="p-3 sm:p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-100 active:bg-primary-200 disabled:opacity-75 disabled:cursor-not-allowed rounded-r-lg transition-all duration-200 min-h-[44px] sm:min-h-auto flex items-center justify-center"
            >
              <Plus className="h-4 w-4 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        {/* Item Total */}
        <div className="text-right">
          <div className="text-sm sm:text-sm text-gray-500 mb-1">Total do item</div>
          <div className="text-xl sm:text-xl font-bold text-gray-900">{formatPrice(itemTotal)}</div>
        </div>
      </div>
    </div>
  );
}
