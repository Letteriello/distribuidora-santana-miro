"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import ProductFallback from "./ProductFallback";
import { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  error?: string | null;
  onRetry?: () => void;
}

export default function ProductGrid({
  products,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  error,
  onRetry,
}: ProductGridProps) {
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-gray-200"></div>
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-7 sm:h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <ProductFallback
        error={error}
        onRetry={onRetry}
        hasFilters={true}
        className="py-8 sm:py-16"
      />
    );
  }

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-2 px-2">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
            className={`flex items-center justify-center space-x-1 px-4 py-3 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] sm:min-h-auto ${
              hasPreviousPage
                ? "text-gray-700 hover:bg-gray-100 border border-gray-300 active:bg-gray-200"
                : "text-gray-400 cursor-not-allowed border border-gray-200"
            }`}
          >
            <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1 overflow-x-auto max-w-full px-2">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === "number" && onPageChange(page)}
                disabled={page === "..."}
                className={`px-3 py-2 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] sm:min-h-auto min-w-[44px] sm:min-w-auto flex items-center justify-center ${
                  page === currentPage
                    ? "bg-primary-600 text-white"
                    : page === "..."
                      ? "text-gray-400 cursor-default"
                      : "text-gray-700 hover:bg-gray-100 border border-gray-300 active:bg-gray-200"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className={`flex items-center justify-center space-x-1 px-4 py-3 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] sm:min-h-auto ${
              hasNextPage
                ? "text-gray-700 hover:bg-gray-100 border border-gray-300 active:bg-gray-200"
                : "text-gray-400 cursor-not-allowed border border-gray-200"
            }`}
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
      )}

      {/* Page Info */}
      <div className="text-center mt-4 text-xs sm:text-sm text-gray-600">
        Página {currentPage} de {totalPages}
      </div>
    </div>
  );
}
