import { mutation } from "../../_generated/server";
import { v } from "convex/values";

// Mutation para adicionar item ao carrinho
export const addToCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Verificar se o produto existe e está ativo
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Produto não encontrado");
    }

    if (!product.isActive) {
      throw new Error("Produto não está disponível");
    }

    if (product.availableQuantity < args.quantity) {
      throw new Error(`Apenas ${product.availableQuantity} unidades disponíveis`);
    }

    if (args.quantity <= 0) {
      throw new Error("Quantidade deve ser maior que zero");
    }

    // Buscar carrinho existente
    let cartSession = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const now = Date.now();

    if (!cartSession) {
      // Criar novo carrinho
      const cartId = await ctx.db.insert("cart_sessions", {
        sessionId: args.sessionId,
        items: [
          {
            productId: args.productId,
            quantity: args.quantity,
            unitPrice: product.price,
          },
        ],
        totalItems: args.quantity,
        totalAmount: product.price * args.quantity,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, cartId };
    }

    // Verificar se o produto já está no carrinho
    const existingItemIndex = cartSession.items.findIndex(
      (item) => item.productId === args.productId
    );

    let updatedItems;
    let newTotalItems;
    let newTotalValue;

    if (existingItemIndex >= 0) {
      // Atualizar quantidade do item existente
      const existingItem = cartSession.items[existingItemIndex];
      const newQuantity = existingItem.quantity + args.quantity;

      if (product.availableQuantity < newQuantity) {
        throw new Error(`Apenas ${product.availableQuantity} unidades disponíveis`);
      }

      updatedItems = [...cartSession.items];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        unitPrice: product.price, // Atualizar preço
      };
    } else {
      // Adicionar novo item
      updatedItems = [
        ...cartSession.items,
        {
          productId: args.productId,
          quantity: args.quantity,
          unitPrice: product.price,
        },
      ];
    }

    // Recalcular totais
    newTotalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    newTotalValue = updatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Atualizar carrinho
    await ctx.db.patch(cartSession._id, {
      items: updatedItems,
      totalItems: newTotalItems,
      totalAmount: newTotalValue,
      updatedAt: now,
    });

    return { success: true, cartId: cartSession._id };
  },
});

// Mutation para remover item do carrinho
export const removeFromCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession) {
      throw new Error("Carrinho não encontrado");
    }

    // Filtrar item a ser removido
    const updatedItems = cartSession.items.filter((item) => item.productId !== args.productId);

    if (updatedItems.length === cartSession.items.length) {
      throw new Error("Item não encontrado no carrinho");
    }

    // Recalcular totais
    const newTotalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const newTotalValue = updatedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Atualizar carrinho
    await ctx.db.patch(cartSession._id, {
      items: updatedItems,
      totalItems: newTotalItems,
      totalAmount: newTotalValue,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation para atualizar quantidade de um item
export const updateCartItemQuantity = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantidade deve ser maior que zero");
    }

    // Verificar disponibilidade do produto
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Produto não encontrado");
    }

    if (!product.isActive) {
      throw new Error("Produto não está disponível");
    }

    if (product.availableQuantity < args.quantity) {
      throw new Error(`Apenas ${product.availableQuantity} unidades disponíveis`);
    }

    const cartSession = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession) {
      throw new Error("Carrinho não encontrado");
    }

    // Encontrar e atualizar item
    const itemIndex = cartSession.items.findIndex((item) => item.productId === args.productId);

    if (itemIndex === -1) {
      throw new Error("Item não encontrado no carrinho");
    }

    const updatedItems = [...cartSession.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: args.quantity,
      unitPrice: product.price, // Atualizar preço
    };

    // Recalcular totais
    const newTotalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const newTotalValue = updatedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Atualizar carrinho
    await ctx.db.patch(cartSession._id, {
      items: updatedItems,
      totalItems: newTotalItems,
      totalAmount: newTotalValue,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation para limpar carrinho
export const clearCart = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession) {
      return { success: true }; // Carrinho já não existe
    }

    // Limpar carrinho
    await ctx.db.patch(cartSession._id, {
      items: [],
      totalItems: 0,
      totalAmount: 0,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
