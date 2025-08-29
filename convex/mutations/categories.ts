import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Mutation para criar ou atualizar categoria
export const upsertCategory = mutation({
  args: {
    name: v.string(),
    productCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verificar se categoria já existe
    const existingCategory = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    const now = Date.now();

    if (existingCategory) {
      // Atualizar categoria existente
      await ctx.db.patch(existingCategory._id, {
        productCount: args.productCount || existingCategory.productCount,
        isActive: true, // Reativar se estava inativa
      });

      return {
        success: true,
        categoryId: existingCategory._id,
        action: "updated",
      };
    } else {
      // Criar nova categoria
      const categoryId = await ctx.db.insert("categories", {
        name: args.name,
        productCount: args.productCount || 0,
        isActive: true,
      });

      return {
        success: true,
        categoryId,
        action: "created",
      };
    }
  },
});

// Mutation para atualizar contador de produtos de uma categoria
export const updateCategoryProductCount = mutation({
  args: {
    categoryName: v.string(),
    increment: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.categoryName))
      .first();

    if (!category) {
      // Criar categoria se não existir
      const categoryId = await ctx.db.insert("categories", {
        name: args.categoryName,
        productCount: Math.max(0, args.increment || 1),
        isActive: true,
      });

      return { success: true, categoryId, action: "created" };
    }

    // Atualizar contador
    const newCount = Math.max(0, category.productCount + (args.increment || 1));

    await ctx.db.patch(category._id, {
      productCount: newCount,
    });

    return { success: true, categoryId: category._id, action: "updated" };
  },
});

// Mutation para recalcular contadores de produtos para todas as categorias
export const recalculateCategoryProductCounts = mutation({
  args: {},
  handler: async (ctx) => {
    // Buscar todas as categorias
    const categories = await ctx.db.query("categories").collect();

    // Buscar todos os produtos ativos
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Contar produtos por categoria
    const categoryProductCounts = new Map<string, number>();

    products.forEach((product) => {
      const currentCount = categoryProductCounts.get(product.category) || 0;
      categoryProductCounts.set(product.category, currentCount + 1);
    });

    // Atualizar contadores das categorias existentes
    const updatePromises = categories.map(async (category) => {
      const newCount = categoryProductCounts.get(category.name) || 0;

      if (category.productCount !== newCount) {
        await ctx.db.patch(category._id, {
          productCount: newCount,
        });
      }

      return { categoryName: category.name, oldCount: category.productCount, newCount };
    });

    // Criar categorias para produtos que não têm categoria cadastrada
    const existingCategoryNames = new Set(categories.map((cat) => cat.name));
    const newCategoryPromises = [];

    for (const [categoryName, productCount] of Array.from(categoryProductCounts.entries())) {
      if (!existingCategoryNames.has(categoryName)) {
        const promise = ctx.db.insert("categories", {
          name: categoryName,
          productCount,
          isActive: true,
        });

        newCategoryPromises.push(
          promise.then((categoryId) => ({
            categoryName,
            categoryId,
            productCount,
            action: "created",
          }))
        );
      }
    }

    const [updateResults, newCategoryResults] = await Promise.all([
      Promise.all(updatePromises),
      Promise.all(newCategoryPromises),
    ]);

    return {
      success: true,
      updated: updateResults.filter((result) => result.oldCount !== result.newCount),
      created: newCategoryResults,
      totalCategories: categories.length + newCategoryResults.length,
      totalProducts: products.length,
    };
  },
});

// Mutation para desativar categoria
export const deactivateCategory = mutation({
  args: { categoryName: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.categoryName))
      .first();

    if (!category) {
      throw new Error("Categoria não encontrada");
    }

    await ctx.db.patch(category._id, {
      isActive: false,
    });

    return { success: true, categoryId: category._id };
  },
});
