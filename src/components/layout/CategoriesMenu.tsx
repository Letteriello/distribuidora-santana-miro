"use client";

import { useState, useEffect } from "react";
import {
  X,
  Grid3X3,
  ChevronRight,
  Utensils,
  Package,
  Hammer,
  Gamepad2,
  Bed,
  Thermometer,
  Zap,
  ShoppingBag,
  Recycle,
  Sparkles,
  Wrench,
  Shirt,
  Home,
  Droplets,
  Scissors,
  Palette,
} from "lucide-react";
import { useCategoriesAPI } from "@/hooks/useCategoriesAPI";
import { useRouter } from "next/navigation";
import type { Category } from "@/types";

interface CategoriesMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mapeamento de ícones para categorias (mesmo do CategoryDropdown)
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();

  // Utensílios e cozinha
  if (name.includes("utensílio") || name.includes("utensilio")) return Utensils;

  // Materiais específicos
  if (name.includes("plástico") || name.includes("plastico")) return Recycle;
  if (name.includes("alumínio") || name.includes("aluminio")) return Sparkles;
  if (name.includes("vidro")) return Droplets;

  // Ferramentas e equipamentos
  if (name.includes("ferramenta")) return Hammer;
  if (name.includes("chave") || name.includes("parafuso")) return Wrench;

  // Casa e móveis
  if (name.includes("cama") || name.includes("mesa") || name.includes("móvel")) return Bed;
  if (name.includes("banho") || name.includes("banheiro")) return Home;

  // Têxtil e vestuário
  if (name.includes("tecido") || name.includes("roupa") || name.includes("têxtil")) return Shirt;

  // Limpeza e higiene
  if (name.includes("limpeza") || name.includes("higiene")) return Sparkles;

  // Papelaria e escritório
  if (name.includes("papel") || name.includes("escritório") || name.includes("caneta"))
    return Scissors;

  // Arte e decoração
  if (name.includes("tinta") || name.includes("decoração") || name.includes("arte")) return Palette;

  // Brinquedos e jogos
  if (name.includes("brinquedo") || name.includes("jogo")) return Gamepad2;

  // Térmicos e temperatura
  if (name.includes("térmico") || name.includes("termico") || name.includes("temperatura"))
    return Thermometer;

  // Eletrônicos e elétricos
  if (name.includes("eletro") || name.includes("eletrônico") || name.includes("elétrico"))
    return Zap;

  // Embalagens genéricas
  if (name.includes("embalagem") || name.includes("saco") || name.includes("caixa")) return Package;

  return ShoppingBag; // ícone padrão
};

export function CategoriesMenu({ isOpen, onClose }: CategoriesMenuProps) {
  const { categories, isLoading, error } = useCategoriesAPI();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fechar menu ao pressionar ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category.name);
    // Navegar para a página de produtos com filtro de categoria
    const searchParams = new URLSearchParams();
    searchParams.set("categoria", category.name);
    router.push(`/?${searchParams.toString()}`);
    onClose();
  };

  const handleAllProductsClick = () => {
    setSelectedCategory(null);
    router.push("/");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose} />

      {/* Menu Lateral */}
      <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary-50">
          <div className="flex items-center space-x-2">
            <Grid3X3 className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-primary-800">Categorias</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-primary-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="p-4">
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="text-center text-red-600">
                <p className="font-medium">Erro ao carregar categorias</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Todos os Produtos */}
              <button
                onClick={handleAllProductsClick}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors mb-2 ${
                  selectedCategory === null
                    ? "bg-primary-100 text-primary-800 border border-primary-200"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="font-medium">Todos os Produtos</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Lista de Categorias */}
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => handleCategoryClick(category)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedCategory === category.name
                        ? "bg-primary-100 text-primary-800 border border-primary-200"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const IconComponent = getCategoryIcon(category.name);
                        return <IconComponent className="h-5 w-5 text-primary-600" />;
                      })()}
                      <div className="text-left">
                        <span className="font-medium block">{category.name}</span>
                        <span className="text-xs text-gray-500">
                          {category.productCount} produto{category.productCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </div>

              {/* Footer Info */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-center text-sm text-gray-500">
                  <p>{categories.length} categorias disponíveis</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
