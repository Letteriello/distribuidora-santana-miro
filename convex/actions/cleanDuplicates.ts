"use node";

import { api } from "../_generated/api";
import { action } from "../_generated/server";

type ProductCount = {
  totalProducts: number;
  uniqueProducts: number;
  duplicates: number;
  expectedAfterCleanup: number;
};

type DuplicateExternalId = {
  externalId: string;
  count: number;
};

export const cleanDuplicatesInBatches = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("Iniciando limpeza de duplicatas por externalId...");

      // Primeiro, contar produtos para ter uma ideia do tamanho
      const countResult: ProductCount = await ctx.runMutation(
        api.mutations.cleanDuplicates.countDuplicateProducts
      );
      console.log("Contagem inicial:", countResult);

      if (countResult.duplicates === 0) {
        return {
          success: true,
          message: "Nenhuma duplicata encontrada",
          initialCount: countResult,
          finalCount: countResult,
          totalDeleted: 0,
          externalIdsProcessed: 0,
        };
      }

      // Buscar externalIds com duplicatas
      const duplicateResult = await ctx.runMutation(
        api.mutations.cleanDuplicates.getDuplicateExternalIds,
        {
          limit: 500, // Processar até 500 externalIds por vez
        }
      );

      console.log(`Encontrados ${duplicateResult.totalFound} externalIds com duplicatas`);

      if (duplicateResult.totalFound === 0) {
        return {
          success: true,
          message: "Nenhum externalId duplicado encontrado",
          initialCount: countResult,
          finalCount: countResult,
          totalDeleted: 0,
          externalIdsProcessed: 0,
        };
      }

      let totalDeleted = 0;
      let processedCount = 0;

      // Processar cada externalId individualmente
      for (const duplicate of duplicateResult.duplicateExternalIds) {
        console.log(
          `Processando externalId ${duplicate.externalId} (${duplicate.count} produtos)...`
        );

        const result = await ctx.runMutation(
          api.mutations.cleanDuplicates.cleanDuplicatesByExternalId,
          {
            externalId: duplicate.externalId,
          }
        );

        totalDeleted += result.deletedCount;
        processedCount++;

        console.log(
          `ExternalId ${duplicate.externalId}: ${result.deletedCount} duplicatas removidas`
        );

        // Pequena pausa entre processamentos
        if (processedCount % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Contagem final
      const finalCount: ProductCount = await ctx.runMutation(
        api.mutations.cleanDuplicates.countDuplicateProducts
      );
      console.log("Contagem final:", finalCount);

      return {
        success: true,
        initialCount: countResult,
        finalCount,
        totalDeleted,
        externalIdsProcessed: processedCount,
      };
    } catch (error) {
      console.error("Erro na limpeza por externalId:", error);
      throw error;
    }
  },
});
