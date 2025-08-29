import { query } from "../_generated/server";
import { v } from "convex/values";

// Query para obter carrinho por sessionId usando API externa
export const getCartBySessionAPI = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions_api")
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

    // Transformar items para o formato esperado pelos componentes
    const itemsWithDetails = cartSession.items.map((item) => ({
      externalId: item.externalId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      product: {
        externalId: item.externalId,
        name: item.productName,
        image: item.productImage,
        price: item.unitPrice,
        category: item.productCategory,
        brand: item.productBrand,
        // Campos necessários para compatibilidade
        availableQuantity: 999, // Será validado em tempo real pela API
        unit: "UN",
        isActive: true,
        lastSyncAt: Date.now(),
      },
    }));

    const totalItems = cartSession.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartSession.totalAmount;

    return {
      sessionId: cartSession.sessionId,
      items: itemsWithDetails,
      totalItems,
      totalAmount,
      createdAt: cartSession.createdAt,
      updatedAt: cartSession.updatedAt,
    };
  },
});

// Query para validar itens do carrinho com dados da API externa
export const validateCartItemsAPI = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions_api")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession || cartSession.items.length === 0) {
      return {
        isValid: true,
        issues: [],
      };
    }

    const issues: Array<{
      externalId: string;
      type: string;
      message: string;
    }> = [];

    // Nota: A validação real de estoque deve ser feita no frontend
    // consultando a API externa em tempo real
    // Aqui apenas retornamos uma estrutura básica

    return {
      isValid: issues.length === 0,
      issues,
    };
  },
});

// Query para estatísticas do carrinho
export const getCartStatsAPI = query({
  args: {},
  handler: async (ctx) => {
    const cartSessions = await ctx.db.query("cart_sessions_api").collect();

    // Filtrar carrinhos ativos (atualizados nas últimas 24 horas)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeCarts = cartSessions.filter((cart) => cart.updatedAt > oneDayAgo);

    // Filtrar carrinhos recentes (atualizados na última hora)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCarts = cartSessions.filter((cart) => cart.updatedAt > oneHourAgo);

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
      avgCartValue,
      avgItemsPerCart,
    };
  },
});
