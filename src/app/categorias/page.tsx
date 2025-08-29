"use client";

import React from "react";
import { useCategoriesAPI } from "../../hooks/useCategoriesAPI";
import { CategoryGrid } from "../../components/category/CategoryGrid";
import NetworkErrorIndicator from "../../components/ui/NetworkErrorIndicator";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CategoriasPage() {
  const { categories, isLoading, error, refetch } = useCategoriesAPI();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
                <p className="text-gray-600 mt-1">Explore nossos produtos por categoria</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {!isLoading && categories.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Total de Categorias</h2>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{categories.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Categorias ativas disponíveis</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Clique em uma categoria para ver os produtos
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Network Error Indicator */}
        {error && (
          <div className="mb-6">
            <NetworkErrorIndicator error={error} onRetry={refetch} variant="banner" />
          </div>
        )}

        {/* Categories Grid */}
        <CategoryGrid
          categories={categories}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />
      </div>
    </div>
  );
}
