"use client";

import { X, ShoppingCart, ShoppingBag } from "lucide-react";
import { useCartItems, useCartTotal, useCartItemCount } from "../../stores/cartStore";
import CartItem from "./CartItem";
import { ProductRecommendations } from "./ProductRecommendations";
import { ProgressBar } from "./ProgressBar";
import { openWhatsAppOrder } from "@/utils/whatsapp";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const cartItems = useCartItems();
  const totalAmount = useCartTotal();
  const totalItems = useCartItemCount();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleWhatsAppCheckout = () => {
    if (cartItems.length === 0) return;

    const orderData = {
      items: cartItems.map((item) => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        externalId: item.product.externalId,
      })),
      totalAmount,
      totalItems,
    };

    openWhatsAppOrder(orderData);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-6 w-6 sm:h-5 sm:w-5 text-primary-600" />
              <h2 className="text-xl sm:text-lg font-semibold text-gray-900">
                Carrinho ({cartItems.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-3 sm:p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center"
            >
              <X className="h-6 w-6 sm:h-5 sm:w-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Bar - sempre visível quando há itens */}
          {cartItems.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <ProgressBar currentAmount={totalAmount} />
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-4">
                <ShoppingCart className="h-20 w-20 sm:h-16 sm:w-16 text-gray-300 mb-6 sm:mb-4" />
                <h3 className="text-xl sm:text-lg font-medium text-gray-900 mb-3 sm:mb-2">
                  Seu carrinho está vazio
                </h3>
                <p className="text-base sm:text-sm text-gray-500 mb-8 sm:mb-6">
                  Adicione produtos para começar sua compra
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-4 sm:px-4 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-base sm:text-sm font-medium min-h-[48px] sm:min-h-auto"
                >
                  Continuar Comprando
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Lista de itens do carrinho */}
                <div className="p-3 sm:p-2">
                  {cartItems.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>

                {/* Recomendações de produtos */}
                <div className="px-3 sm:px-2">
                  <ProductRecommendations cartItems={cartItems} currentAmount={totalAmount} />
                </div>
              </div>
            )}
          </div>

          {/* Cart Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-gray-200 p-4 sm:p-4 bg-white sticky bottom-0">
              {/* Cart Summary */}
              <div className="space-y-3 sm:space-y-3 mb-6 sm:mb-6">
                <div className="flex justify-between text-base sm:text-sm">
                  <span className="text-gray-800 font-medium">
                    Subtotal ({totalItems} {totalItems === 1 ? "item" : "itens"})
                  </span>
                  <span className="font-semibold text-gray-900">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-base sm:text-sm">
                  <span className="text-gray-800 font-medium">Frete</span>
                  <span className="text-primary-600 font-semibold">A calcular</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-xl sm:text-lg font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-primary-600">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 sm:space-y-3">
                <button
                  onClick={handleWhatsAppCheckout}
                  className="w-full bg-green-600 text-white py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center space-x-2 shadow-sm text-base sm:text-sm min-h-[52px] sm:min-h-auto"
                >
                  <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                  <span>Finalizar no WhatsApp</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 text-gray-700 py-3 sm:py-2 px-4 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors text-base sm:text-sm min-h-[48px] sm:min-h-auto"
                >
                  Continuar Comprando
                </button>
              </div>

              {/* Contact Info */}
              <div className="mt-4 sm:mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm sm:text-xs text-gray-500 text-center">
                  Dúvidas? Entre em contato: +55 67 99601-031
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
