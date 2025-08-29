"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, X, ChevronDown, DollarSign, Tag } from "lucide-react";
import { useBrandsByCategory } from "@/hooks/useBrandsByCategory";
import type { ProductFilters as ProductFiltersType } from "@/types";

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onFiltersChange: (filters: ProductFiltersType) => void;
  totalProducts: number;
}

export default function ProductFilters({
  filters,
  onFiltersChange,
  totalProducts,
}: ProductFiltersProps) {
  const { brands, isLoading: brandsLoading } = useBrandsByCategory(filters.category);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [minPriceInput, setMinPriceInput] = useState(filters.minPrice?.toString() || "");
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPrice?.toString() || "");

  // Debounce search input
  const handleSearchChange = useCallback(
    (newSearch: string) => {
      onFiltersChange({ ...filters, search: newSearch });
    },
    [filters, onFiltersChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        handleSearchChange(searchInput);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search, handleSearchChange]);

  // Debounce price filters
  const handlePriceChange = useCallback(
    (minPrice?: number, maxPrice?: number) => {
      onFiltersChange({
        ...filters,
        minPrice: minPrice && !isNaN(minPrice) ? minPrice : undefined,
        maxPrice: maxPrice && !isNaN(maxPrice) ? maxPrice : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const minPrice = minPriceInput ? parseFloat(minPriceInput) : undefined;
      const maxPrice = maxPriceInput ? parseFloat(maxPriceInput) : undefined;

      if (minPrice !== filters.minPrice || maxPrice !== filters.maxPrice) {
        handlePriceChange(minPrice, maxPrice);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [minPriceInput, maxPriceInput, filters.minPrice, filters.maxPrice, handlePriceChange]);

  const handleBrandChange = (brand: string) => {
    onFiltersChange({
      ...filters,
      brand: filters.brand === brand ? undefined : brand,
    });
  };

  const handleSortChange = (sortBy: "name" | "price" | "category", sortOrder: "asc" | "desc") => {
    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder,
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    onFiltersChange({
      ...filters,
      search: "",
      category: undefined,
      brand: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sortBy: "name",
      sortOrder: "asc",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.brand ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.sortBy !== "name" ||
    filters.sortOrder !== "asc";

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Mobile Filter Toggle */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
          >
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
            <ChevronDown
              className={`h-4 w-4 transform transition-transform ${
                showMobileFilters ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Filters Container */}
        <div
          className={`space-y-4 md:space-y-0 md:flex md:items-center md:justify-between ${
            showMobileFilters ? "block" : "hidden md:flex"
          }`}
        >
          {/* Left Side - Search and Categories */}
          <div className="flex-1 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-700 focus:outline-none focus:placeholder-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Category Filter - Compact */}
            {filters.category && (
              <div className="text-sm text-gray-600">
                Categoria: <span className="font-medium text-primary-600">{filters.category}</span>
              </div>
            )}

            {/* Advanced Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Price Range */}
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Preço:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Brand Filter */}
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Marca:</span>
                <select
                  value={filters.brand || ""}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                >
                  <option value="" className="text-gray-900">
                    Todas as marcas
                  </option>
                  {brandsLoading ? (
                    <option disabled className="text-gray-500">
                      Carregando...
                    </option>
                  ) : (
                    brands?.map((brand) => (
                      <option key={brand.name} value={brand.name} className="text-gray-900">
                        {brand.name} ({brand.productCount})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Right Side - Sort and Results */}
          <div className="flex items-center justify-between md:justify-end space-x-6">
            {/* Results Count */}
            <span className="text-sm text-gray-600 font-medium mr-4">
              {totalProducts} produto{totalProducts !== 1 ? "s" : ""}
            </span>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Ordenar:</label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split("-");
                  handleSortChange(
                    sortBy as "name" | "price" | "category",
                    sortOrder as "asc" | "desc"
                  );
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
              >
                <option value="name-asc">Nome A-Z</option>
                <option value="name-desc">Nome Z-A</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="availableQuantity-desc">Mais estoque</option>
                <option value="availableQuantity-asc">Menos estoque</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.search && (
              <div className="flex items-center space-x-1 bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm">
                <span>Busca: &quot;{filters.search}&quot;</span>
                <button
                  onClick={() => {
                    setSearchInput("");
                    onFiltersChange({ ...filters, search: "" });
                  }}
                  className="hover:bg-primary-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filters.category && (
              <div className="flex items-center space-x-1 bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm">
                <span>Categoria: {filters.category}</span>
                <button
                  onClick={() => onFiltersChange({ ...filters, category: undefined })}
                  className="hover:bg-primary-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filters.brand && (
              <div className="flex items-center space-x-1 bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm">
                <span>Marca: {filters.brand}</span>
                <button
                  onClick={() => onFiltersChange({ ...filters, brand: undefined })}
                  className="hover:bg-primary-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {(filters.minPrice || filters.maxPrice) && (
              <div className="flex items-center space-x-1 bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm">
                <span>
                  Preço: {filters.minPrice ? `R$ ${filters.minPrice}` : "0"} -{" "}
                  {filters.maxPrice ? `R$ ${filters.maxPrice}` : "∞"}
                </span>
                <button
                  onClick={() => {
                    setMinPriceInput("");
                    setMaxPriceInput("");
                    onFiltersChange({ ...filters, minPrice: undefined, maxPrice: undefined });
                  }}
                  className="hover:bg-primary-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
