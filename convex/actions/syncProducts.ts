"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { ActionCtx } from "../_generated/server";

// Função auxiliar para fazer requisição com retry
async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<any> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentativa ${attempt}/${maxRetries} para: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const apiResponse: any = await response.json();

      // A API retorna um objeto com metadados e um array de produtos
      if (!apiResponse || typeof apiResponse !== "object") {
        throw new Error("Formato de resposta inválido da API - esperado objeto");
      }

      return apiResponse;
    } catch (error) {
      lastError = error as Error;
      console.error(`Tentativa ${attempt} falhou:`, error);

      if (attempt < maxRetries) {
        // Aguardar antes da próxima tentativa (backoff exponencial)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Action para buscar todos os produtos da API externa em uma única requisição
export const syncProductsFromExternalAPI = action({
  args: {},
  handler: async (ctx: ActionCtx): Promise<any> => {
    try {
      console.log("Iniciando sincronização completa de produtos...");

      // Marcar o início da sincronização para desativar produtos antigos depois
      const syncStartTime = Date.now();

      // Usar o novo endpoint com tamanho_pagina=3000 para buscar todos os produtos
      const apiUrl = "https://fiscalfacil.com/LojaVirtual/14044/produtos?tamanho_pagina=3000";
      console.log(`Buscando todos os produtos de: ${apiUrl}`);

      const apiResponse = await fetchWithRetry(apiUrl);

      // A API retorna um objeto com a chave 'dados' contendo o array de produtos
      const allProducts = apiResponse.dados || [];
      const totalProducts = allProducts.length;

      console.log(`Total de produtos encontrados: ${totalProducts}`);

      // Produtos carregados com sucesso

      if (totalProducts === 0) {
        console.log("Nenhum produto encontrado na API");
        return {
          success: true,
          totalProducts: 0,
          processedBatches: 0,
          deactivatedProducts: 0,
          message: "Nenhum produto encontrado na API",
        };
      }

      // Processar produtos em lotes menores para evitar limite de bytes
      const batchSize = 20;
      let processedBatches = 0;
      let totalProcessed = 0;

      console.log(`Processando ${totalProducts} produtos em lotes de ${batchSize}...`);

      for (let i = 0; i < allProducts.length; i += batchSize) {
        const batch = allProducts.slice(i, i + batchSize);
        const batchNumber = processedBatches + 1;

        console.log(
          `Processando lote ${batchNumber} com ${batch.length} produtos (${i + 1}-${Math.min(i + batchSize, totalProducts)})...`
        );

        try {
          // Chamar mutation interna para processar o lote
          const result = await ctx.runMutation(
            internal.mutations.syncProducts.processExternalProducts,
            {
              products: batch,
            }
          );

          processedBatches++;
          totalProcessed += result.processed || 0;
          console.log(
            `Lote ${batchNumber} processado: ${result.processed} produtos (Total processado: ${totalProcessed})`
          );
        } catch (batchError) {
          console.error(`Erro ao processar lote ${batchNumber}:`, batchError);
          console.error(`Stack trace:`, (batchError as Error).stack);
          console.error(`Detalhes do erro:`, {
            message: (batchError as Error).message,
            name: (batchError as Error).name,
            batchSize: batch.length,
            batchNumber,
            totalProcessedSoFar: totalProcessed,
          });

          // Se for um erro crítico (limite de recursos), parar a sincronização
          if (
            (batchError as Error).message.includes("Too many") ||
            (batchError as Error).message.includes("limit") ||
            (batchError as Error).message.includes("timeout")
          ) {
            console.error(`Erro crítico detectado no lote ${batchNumber}. Parando sincronização.`);
            break;
          }

          // Para outros erros, continuar com próximo lote
          console.log(`Continuando com próximo lote após erro no lote ${batchNumber}`);
        }

        // Pequena pausa entre lotes para não sobrecarregar o sistema
        if (i + batchSize < allProducts.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(
        `Sincronização completa finalizada: ${processedBatches} lotes processados, ${totalProcessed} produtos processados`
      );

      // Não desativar produtos antigos na sincronização principal para evitar limites do Convex
      // A desativação pode ser feita separadamente se necessário
      console.log(
        "Sincronização concluída com sucesso. Desativação de produtos antigos pode ser executada separadamente se necessário."
      );

      return {
        success: true,
        totalProducts,
        totalProcessed,
        processedBatches,
        deactivatedProducts: 0,
        message: `Sincronização completa: ${totalProducts} produtos encontrados, ${totalProcessed} processados em ${processedBatches} lotes`,
      };
    } catch (error) {
      console.error("Erro na sincronização completa:", error);
      throw error;
    }
  },
});
