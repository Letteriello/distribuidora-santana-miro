"use client";

// Componente temporariamente desabilitado devido ao Convex ter excedido limites do plano gratuito
// import { useQuery } from "convex/react";
// import { api } from "../../../convex/_generated/api";

export default function ProductsDebugTemp() {
  return (
    <div className="bg-gray-100 p-4 rounded-lg mt-4">
      <h3 className="text-lg font-semibold mb-2">Debug - Produtos (Temporário)</h3>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">Componente de debug temporariamente desabilitado</p>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Categorias:</h4>
          <p className="text-sm text-gray-600">Debug de categorias temporariamente desabilitado</p>
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Produtos:</h4>
          <p className="text-sm text-gray-600">Debug de produtos temporariamente desabilitado</p>
        </div>
      </div>
    </div>
  );
}
