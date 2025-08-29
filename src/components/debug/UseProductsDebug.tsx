"use client";

import { useProductsAPI } from "@/hooks/useProductsAPI";
import type { ProductFilters as ProductFiltersType } from "@/types";

interface UseProductsDebugProps {
  filters: ProductFiltersType;
  currentPage: number;
  itemsPerPage: number;
}

export default function UseProductsDebug({
  filters,
  currentPage,
  itemsPerPage,
}: UseProductsDebugProps) {
  const { products, isLoading, totalCount } = useProductsAPI({
    initialFilters: filters,
    pageSize: itemsPerPage,
    currentPage: currentPage,
  });

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 m-4">
      <h2 className="text-lg font-semibold text-orange-800 mb-4">Debug: Hook useProductsAPI</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-3 rounded border">
          <h3 className="font-medium text-gray-800">Loading</h3>
          <p className="text-2xl font-bold text-orange-600">{isLoading ? "SIM" : "NÃO"}</p>
        </div>

        <div className="bg-white p-3 rounded border">
          <h3 className="font-medium text-gray-800">Total Count</h3>
          <p className="text-2xl font-bold text-blue-600">{totalCount}</p>
        </div>

        <div className="bg-white p-3 rounded border">
          <h3 className="font-medium text-gray-800">Products Length</h3>
          <p className="text-2xl font-bold text-green-600">{products.length}</p>
        </div>

        <div className="bg-white p-3 rounded border">
          <h3 className="font-medium text-gray-800">Current Page</h3>
          <p className="text-2xl font-bold text-purple-600">{currentPage}</p>
        </div>
      </div>

      {products.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-gray-800 mb-2">Primeiros 3 Produtos do Hook:</h3>
          <div className="bg-white rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Preço</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 3).map((product, index) => (
                  <tr key={product._id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-3 py-2 font-mono text-xs">{product._id}</td>
                    <td className="px-3 py-2">{product.name}</td>
                    <td className="px-3 py-2">R$ {product.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white p-3 rounded border">
        <h3 className="font-medium text-gray-800 mb-2">Filtros Ativos:</h3>
        <pre className="text-xs text-gray-600 overflow-auto">
          {JSON.stringify(filters, null, 2)}
        </pre>
      </div>
    </div>
  );
}
