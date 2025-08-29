import { mutation } from "../_generated/server";

// Mutation para recalcular contadores de produtos por categoria
export const updateCategoryCounters = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("Iniciando recálculo de contadores de categoria...");

      // Buscar todas as categorias
      const categories = await ctx.db.query("categories").collect();

      let updatedCount = 0;

      for (const category of categories) {
        // Contar produtos ativos nesta categoria
        const activeProductsCount = await ctx.db
          .query("products")
          .withIndex("by_category", (q: any) => q.eq("category", category.name))
          .filter((q: any) => q.eq(q.field("isActive"), true))
          .collect()
          .then((products: any[]) => products.length);

        // Atualizar contador da categoria
        if (category.productCount !== activeProductsCount) {
          await ctx.db.patch(category._id, {
            productCount: activeProductsCount,
          });

          console.log(
            `Categoria "${category.name}": ${category.productCount} → ${activeProductsCount} produtos`
          );
          updatedCount++;
        }
      }

      console.log(`Recálculo concluído: ${updatedCount} categorias atualizadas`);

      return {
        success: true,
        updatedCount,
        totalCategories: categories.length,
      };
    } catch (error) {
      console.error("Erro no recálculo de contadores:", error);
      throw error;
    }
  },
});
