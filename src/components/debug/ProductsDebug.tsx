"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ProductsDebug() {
  const debugData = useQuery(api.queries.products.debugProducts);

  if (debugData === undefined) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">Debug: Carregando dados...</h2>
        <p className="text-yellow-700">Verificando produtos no banco de dados...</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-4">
      <h2 className="text-lg font-semibold text-blue-800 mb-4">Debug: Status do Banco de Dados</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded border">
          <h3 className="font-medium text-gray-800">Total de Produtos</h3>
          <p className="text-2xl font-bold text-blue-600">{debugData.totalProducts}</p>
        </div>

        <div className="bg-white p-3 rounded border">
          <h3 className="font-medium text-gray-800">Produtos Ativos</h3>
          <p className="text-2xl font-bold text-green-600">{debugData.activeProducts}</p>
        </div>

        <div className="bg-white p-3 rounded border">
          <h3 className="font-medium text-gray-800">Total de Categorias</h3>
          <p className="text-2xl font-bold text-purple-600">{debugData.totalCategories}</p>
        </div>
      </div>

      {debugData.firstFiveProducts.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-gray-800 mb-2">Primeiros 5 Produtos:</h3>
          <div className="bg-white rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Preço</th>
                  <th className="px-3 py-2 text-left">Estoque</th>
                  <th className="px-3 py-2 text-left">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {debugData.firstFiveProducts.map((product, index) => (
                  <tr key={product.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-3 py-2">{product.name}</td>
                    <td className="px-3 py-2">R$ {product.price.toFixed(2)}</td>
                    <td className="px-3 py-2">{product.availableQuantity}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          product.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.isActive ? "Sim" : "Não"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {debugData.allCategories.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-800 mb-2">Categorias:</h3>
          <div className="bg-white rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Produtos</th>
                </tr>
              </thead>
              <tbody>
                {debugData.allCategories.map((category, index) => (
                  <tr key={category.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-3 py-2">{category.name}</td>
                    <td className="px-3 py-2">{category.productCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {debugData.totalProducts === 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
          <p className="text-red-800 font-medium">Nenhum produto encontrado no banco de dados!</p>
          <p className="text-red-700 text-sm mt-1">
            Verifique se a sincronização com a API está funcionando corretamente.
          </p>
        </div>
      )}
    </div>
  );
}
