"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
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

interface CategoryDropdownProps {
  onCategorySelect?: (categoryId: string) => void;
  isMobile?: boolean;
}

// Mapeamento de ícones para categorias
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

// Função para formatar nome da categoria
const formatCategoryName = (name: string): string => {
  // Capitalizar primeira letra de cada palavra e manter acentos
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/\bE\b/g, "e") // 'e' minúsculo quando é conjunção
    .replace(/\bDe\b/g, "de") // 'de' minúsculo quando é preposição
    .replace(/\bDa\b/g, "da") // 'da' minúsculo quando é preposição
    .replace(/\bDo\b/g, "do"); // 'do' minúsculo quando é preposição
};

export default function CategoryDropdown({
  onCategorySelect,
  isMobile = false,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { categories, isLoading } = useCategoriesAPI();
  const router = useRouter();

  // Filtrar categorias para remover 'Teste' e outras indesejadas
  const filteredCategories =
    categories?.filter(
      (category) =>
        category.name.toLowerCase() !== "teste" && category.name.toLowerCase() !== "test"
    ) || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      // Navigate to home with category filter
      router.push(`/?categoria=${encodeURIComponent(categoryName)}`);
    }
    setIsOpen(false);
  };

  const handleAllProductsClick = () => {
    if (onCategorySelect) {
      onCategorySelect("");
    } else {
      router.push("/");
    }
    setIsOpen(false);
  };

  if (isMobile) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full text-gray-700 hover:text-primary-700 font-medium py-2"
        >
          <span>Categorias</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="pl-4 space-y-2">
            <button
              onClick={handleAllProductsClick}
              className="block w-full text-left text-sm text-gray-600 hover:text-primary-700 py-1"
            >
              Todos os Produtos
            </button>
            {isLoading ? (
              <div className="text-sm text-gray-500 py-1">Carregando...</div>
            ) : (
              filteredCategories.map((category) => {
                const IconComponent = getCategoryIcon(category.name);
                return (
                  <button
                    key={category._id}
                    onClick={() => handleCategoryClick(category._id, category.name)}
                    className="flex items-center space-x-2 w-full text-left text-sm text-gray-600 hover:text-primary-700 py-1 transition-colors"
                  >
                    <IconComponent className="h-4 w-4 text-primary-600" />
                    <span>{formatCategoryName(category.name)}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="flex items-center space-x-1 text-gray-700 hover:text-primary-700 font-medium transition-colors h-full"
      >
        <span>Categorias</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="py-2">
            <button
              onClick={handleAllProductsClick}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              Todos os Produtos
            </button>

            <div className="border-t border-gray-100 my-1"></div>

            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">Carregando categorias...</div>
            ) : filteredCategories && filteredCategories.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {filteredCategories.map((category) => {
                  const IconComponent = getCategoryIcon(category.name);
                  return (
                    <button
                      key={category._id}
                      onClick={() => handleCategoryClick(category._id, category.name)}
                      className="flex items-center space-x-3 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors group"
                    >
                      <IconComponent className="h-5 w-5 text-primary-600 group-hover:text-primary-700 transition-colors" />
                      <span className="font-medium">{formatCategoryName(category.name)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">Nenhuma categoria encontrada</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
