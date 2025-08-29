import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Mutation para contar produtos duplicados
export const countDuplicateProducts = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const allProducts = await ctx.db.query("products").collect();
      const totalCount = allProducts.length;

      const uniqueExternalIds = new Set<string>();
      for (const product of allProducts) {
        uniqueExternalIds.add(product.externalId);
      }

      const uniqueCount = uniqueExternalIds.size;
      const duplicates = totalCount - uniqueCount;

      return {
        totalProducts: totalCount,
        uniqueProducts: uniqueCount,
        duplicates,
        expectedAfterCleanup: uniqueCount,
      };
    } catch (error) {
      console.error("Erro ao contar duplicatas:", error);
      throw error;
    }
  },
});

// Mutation para limpar duplicatas por externalId específico
export const cleanDuplicatesByExternalId = mutation({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Buscar todos os produtos com este externalId
      const products = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("externalId"), args.externalId))
        .collect();

      if (products.length <= 1) {
        return { deletedCount: 0, message: "Nenhuma duplicata encontrada para este externalId" };
      }

      console.log(`ExternalId ${args.externalId}: encontrados ${products.length} produtos`);

      // Ordenar por data de criação (mais recente primeiro)
      products.sort((a, b) => b._creationTime - a._creationTime);

      // Manter o primeiro (mais recente), deletar o resto
      const productsToDelete = products.slice(1);

      let deletedCount = 0;
      for (const product of productsToDelete) {
        await ctx.db.delete(product._id);
        deletedCount++;
      }

      return {
        deletedCount,
        message: `${deletedCount} duplicatas removidas para externalId ${args.externalId}`,
      };
    } catch (error) {
      console.error("Erro na limpeza por externalId:", error);
      throw error;
    }
  },
});

// Mutation para obter lista de externalIds com duplicatas
export const getDuplicateExternalIds = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    try {
      console.log("Buscando todos os produtos para identificar duplicatas...");

      // Buscar TODOS os produtos de uma vez para garantir que encontramos todas as duplicatas
      const allProducts = await ctx.db.query("products").collect();
      console.log(`Total de produtos encontrados: ${allProducts.length}`);

      // Contar ocorrências de cada externalId
      const externalIdCounts = new Map<string, number>();

      for (const product of allProducts) {
        const count = externalIdCounts.get(product.externalId) || 0;
        externalIdCounts.set(product.externalId, count + 1);
      }

      console.log(`Total de externalIds únicos: ${externalIdCounts.size}`);

      // Filtrar apenas os que têm duplicatas
      const duplicateExternalIds = Array.from(externalIdCounts.entries())
        .filter(([_, count]) => count > 1)
        .sort(([_, a], [__, b]) => b - a) // Ordenar por quantidade de duplicatas
        .slice(0, limit)
        .map(([externalId, count]) => ({ externalId, count }));

      console.log(`ExternalIds com duplicatas encontrados: ${duplicateExternalIds.length}`);

      if (duplicateExternalIds.length > 0) {
        console.log(
          "Primeiros 5 externalIds com mais duplicatas:",
          duplicateExternalIds.slice(0, 5)
        );
      }

      return {
        duplicateExternalIds,
        totalFound: duplicateExternalIds.length,
        hasMore: false, // Processamos todos os produtos
      };
    } catch (error) {
      console.error("Erro ao buscar externalIds duplicados:", error);
      throw error;
    }
  },
});
