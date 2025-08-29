"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ShoppingCart, Menu, X, Phone, Clock, Grid3X3, MessageCircle } from "lucide-react";
import { useCartItemCount } from "@/stores/cartStore";
import { createWhatsAppUrl, WHATSAPP_SALES_NUMBER } from "@/utils/whatsapp";
import CategoryDropdown from "./CategoryDropdown";
import { CategoriesMenu } from "./CategoriesMenu";

interface HeaderProps {
  onCartOpen?: () => void;
}

export default function Header({ onCartOpen }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
  const cartItemsCount = useCartItemCount();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary-700 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4 text-sm">
              <button
                onClick={() => {
                  const message =
                    "Olá! Gostaria de mais informações sobre os produtos da Distribuidora Mirô.";
                  const whatsappUrl = createWhatsAppUrl(WHATSAPP_SALES_NUMBER, message);
                  window.open(whatsappUrl, "_blank");
                }}
                className="flex items-center space-x-1 hover:text-primary-600 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>+55 67 9960-1031</span>
              </button>

              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Seg-Sex: 8h às 17h30</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span>Rua Rocha Pombo 1078, Caicara, Campo Grande MS, 79090-282</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-lg md:text-2xl font-bold text-primary-700">Distribuidora Mirô</h1>
              <p className="text-xs text-gray-600 hidden sm:block">
                Produtos de qualidade para seu negócio
              </p>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar produtos..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Categories Button - Mobile only */}
            <button
              onClick={() => setIsCategoriesMenuOpen(true)}
              className="md:hidden relative p-2 text-gray-600 hover:text-primary-700 transition-colors bg-gray-50 rounded-lg"
            >
              <Grid3X3 className="h-6 w-6" />
            </button>

            {/* Cart Button - Enhanced for mobile */}
            <button
              onClick={onCartOpen}
              className="relative p-2 md:p-2 text-gray-600 hover:text-primary-700 transition-colors bg-gray-50 md:bg-transparent rounded-lg md:rounded-none"
            >
              <ShoppingCart className="h-6 w-6 md:h-6 md:w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Button - Enhanced */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-primary-700 bg-gray-50 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-primary-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex space-x-8 py-3">
            <Link
              href="/"
              className="text-gray-700 hover:text-primary-700 font-medium transition-colors"
            >
              Produtos
            </Link>
            <CategoryDropdown />
            <button
              onClick={() => {
                const message =
                  "Olá! Gostaria de mais informações sobre os produtos da Distribuidora Mirô.";
                const whatsappUrl = createWhatsAppUrl(WHATSAPP_SALES_NUMBER, message);
                window.open(whatsappUrl, "_blank");
              }}
              className="flex items-center space-x-1 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-4 space-y-4">
            <Link
              href="/"
              className="block text-gray-700 hover:text-primary-700 font-medium transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Produtos
            </Link>

            {/* Contact Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>+55 67 9960-1031</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Seg-Sex: 8h às 17h30</span>
                </div>
              </div>

              {/* WhatsApp Button */}
              <button
                onClick={() => {
                  const message =
                    "Olá! Gostaria de mais informações sobre os produtos da Distribuidora Mirô.";
                  const whatsappUrl = createWhatsAppUrl(WHATSAPP_SALES_NUMBER, message);
                  window.open(whatsappUrl, "_blank");
                  setIsMenuOpen(false);
                }}
                className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Falar no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Menu */}
      <CategoriesMenu
        isOpen={isCategoriesMenuOpen}
        onClose={() => setIsCategoriesMenuOpen(false)}
      />
    </header>
  );
}
