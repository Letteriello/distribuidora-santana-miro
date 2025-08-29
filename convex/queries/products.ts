import { query } from "../_generated/server";
import { v } from "convex/values";

// Query de debug para verificar produtos no banco
export const debugProducts = query({
  args: {},
  handler: async (ctx) => {
    // Contar total de produtos
    const allProducts = await ctx.db.query("products").collect();
    const totalProducts = allProducts.length;

    // Listar primeiros 5 produtos
    const firstFive = await ctx.db.query("products").take(5);

    // Contar produtos ativos (com estoque)
    const activeProducts = allProducts.filter((p) => p.availableQuantity > 0);

    // Verificar categorias
    const allCategories = await ctx.db.query("categories").collect();

    return {
      totalProducts,
      totalCategories: allCategories.length,
      activeProducts: activeProducts.length,
      firstFiveProducts: firstFive.map((p) => ({
        id: p._id,
        name: p.name,
        price: p.price,
        availableQuantity: p.availableQuantity,
        category: p.category,
        isActive: p.isActive,
      })),
      allCategories: allCategories.map((c) => ({
        id: c._id,
        name: c.name,
        productCount: allProducts.filter((p) => p.category === c.name).length,
      })),
    };
  },
});

// Query para produtos em destaque
export const getFeaturedProducts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 8;

    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(limit);

    return products;
  },
});

// Query para obter um produto específico
export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query para obter produto por ID externo
export const getProductByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

export const getProducts = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    search: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStock: v.optional(v.boolean()),
    sortBy: v.optional(v.union(v.literal("name"), v.literal("price"), v.literal("category"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const { limit = 20, offset = 0, category, brand, search, minPrice, maxPrice, inStock } = args;

    let query = ctx.db.query("products").withIndex("by_active", (q) => q.eq("isActive", true));
    let products = await query.collect();

    // Apply filters
    if (category) {
      products = products.filter((p) => p.category === category);
    }

    if (brand) {
      products = products.filter((p) => p.brand && p.brand.trim() === brand.trim());
    }

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          p.brand.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower)
      );
    }

    if (minPrice !== undefined) {
      products = products.filter((p) => p.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      products = products.filter((p) => p.price <= maxPrice);
    }

    if (inStock) {
      products = products.filter((p) => p.availableQuantity > 0);
    }

    // Sorting
    const sortBy = args.sortBy || "name";
    const sortOrder = args.sortOrder || "asc";

    products.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "price":
          aValue = a.price;
          bValue = b.price;
          break;
        case "category":
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? comparison : -comparison;
      } else {
        const comparison = (aValue as number) - (bValue as number);
        return sortOrder === "asc" ? comparison : -comparison;
      }
    });

    // Pagination
    const paginatedProducts = products.slice(offset, offset + limit);

    return {
      products: paginatedProducts,
      total: products.length,
      hasMore: offset + limit < products.length,
    };
  },
});

// Query para obter marcas únicas dos produtos ativos
export const getBrands = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Extrair marcas únicas e contar produtos por marca
    const brandCounts = new Map<string, number>();

    products.forEach((product) => {
      if (product.brand && product.brand.trim()) {
        const brand = product.brand.trim();
        brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
      }
    });

    // Converter para array e ordenar por nome
    const brands = Array.from(brandCounts.entries())
      .map(([name, productCount]) => ({ name, productCount }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return brands;
  },
});

// Query para obter produtos em promoção
export const getPromotionProducts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filtrar apenas produtos em promoção
    const promotionProducts = products.filter((p) => p.isPromotion === true).slice(0, limit);

    return {
      products: promotionProducts,
      total: promotionProducts.length,
    };
  },
});
