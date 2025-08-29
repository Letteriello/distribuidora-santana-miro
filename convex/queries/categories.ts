import { query } from "../_generated/server";
import { v } from "convex/values";

// Query para listar todas as categorias ativas
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Ordenar por número de produtos (categorias com mais produtos primeiro)
    return categories.sort((a, b) => b.productCount - a.productCount);
  },
});

// Query para obter estatísticas das categorias
export const getCategoryStats = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const totalCategories = categories.length;
    const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0);
    const avgProductsPerCategory =
      totalCategories > 0 ? Math.round(totalProducts / totalCategories) : 0;

    return {
      totalCategories,
      totalProducts,
      avgProductsPerCategory,
      categories: categories.map((cat) => ({
        name: cat.name,
        productCount: cat.productCount,
        percentage: totalProducts > 0 ? Math.round((cat.productCount / totalProducts) * 100) : 0,
      })),
    };
  },
});

// Query para obter produtos de uma categoria específica
export const getProductsByCategory = query({
  args: {
    categoryName: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", args.categoryName))
      .collect();

    // Filtrar apenas produtos ativos
    const activeProducts = products.filter((p) => p.isActive);

    // Paginação
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const paginatedProducts = activeProducts.slice(offset, offset + limit);

    return {
      products: paginatedProducts,
      total: activeProducts.length,
      hasMore: offset + limit < activeProducts.length,
      categoryName: args.categoryName,
    };
  },
});
