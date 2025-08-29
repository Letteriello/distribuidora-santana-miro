import { query } from "../_generated/server";
import { v } from "convex/values";

// Query para obter carrinho por sessionId
export const getCartBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession) {
      return {
        sessionId: args.sessionId,
        items: [],
        totalItems: 0,
        totalAmount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    // Buscar detalhes dos produtos para cada item do carrinho
    const itemsWithDetails = await Promise.all(
      cartSession.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (!product) {
          return null;
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
          product: {
            id: product._id,
            externalId: product.externalId,
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: product.price,
            availableQuantity: product.availableQuantity,
            isActive: product.isActive,
          },
        };
      })
    );

    // Filtrar itens nulos (produtos que não existem mais)
    const validItems = itemsWithDetails.filter((item) => item !== null);

    const totalItems = cartSession.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartSession.totalAmount;

    return {
      sessionId: cartSession.sessionId,
      items: validItems,
      totalItems,
      totalAmount,
      createdAt: cartSession.createdAt,
      updatedAt: cartSession.updatedAt,
    };
  },
});

// Query para verificar disponibilidade dos produtos no carrinho
export const validateCartItems = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession) {
      return {
        isValid: true,
        issues: [],
      };
    }

    const issues = [];

    for (const item of cartSession.items) {
      const product = await ctx.db.get(item.productId);

      if (!product) {
        issues.push({
          productId: item.productId,
          type: "product_not_found",
          message: "Produto não encontrado",
        });
        continue;
      }

      if (!product.isActive) {
        issues.push({
          productId: item.productId,
          type: "product_inactive",
          message: `${product.name} não está mais disponível`,
        });
        continue;
      }

      if (product.availableQuantity < item.quantity) {
        issues.push({
          productId: item.productId,
          type: "insufficient_stock",
          message: `${product.name}: apenas ${product.availableQuantity} unidades disponíveis (solicitado: ${item.quantity})`,
          availableQuantity: product.availableQuantity,
          requestedQuantity: item.quantity,
        });
      }

      // Verificar se o preço mudou significativamente (mais de 5%)
      const priceDifference = Math.abs(product.price - item.unitPrice) / item.unitPrice;
      if (priceDifference > 0.05) {
        issues.push({
          productId: item.productId,
          type: "price_changed",
          message: `${product.name}: preço alterado de R$ ${item.unitPrice.toFixed(2)} para R$ ${product.price.toFixed(2)}`,
          oldPrice: item.unitPrice,
          newPrice: product.price,
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  },
});

// Query para obter estatísticas do carrinho
export const getCartStats = query({
  args: {},
  handler: async (ctx) => {
    const cartSessions = await ctx.db.query("cart_sessions").collect();

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const activeCarts = cartSessions.filter((cart) => cart.updatedAt > oneDayAgo);
    const recentCarts = cartSessions.filter((cart) => cart.createdAt > oneWeekAgo);

    const totalValue = cartSessions.reduce((sum, cart) => sum + cart.totalAmount, 0);
    const totalItems = cartSessions.reduce((sum, cart) => {
      return sum + cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    const avgCartValue = cartSessions.length > 0 ? totalValue / cartSessions.length : 0;
    const avgItemsPerCart = cartSessions.length > 0 ? totalItems / cartSessions.length : 0;

    return {
      totalCarts: cartSessions.length,
      activeCarts: activeCarts.length,
      recentCarts: recentCarts.length,
      totalValue,
      totalItems,
      avgCartValue,
      avgItemsPerCart,
    };
  },
});
