import { mutation } from "../../_generated/server";
import { v } from "convex/values";

// Mutation para adicionar item ao carrinho usando externalId
export const addToCartByExternalId = mutation({
  args: {
    sessionId: v.string(),
    externalId: v.string(),
    quantity: v.number(),
    productData: v.object({
      name: v.string(),
      price: v.number(),
      availableQuantity: v.number(),
      image: v.string(),
      category: v.string(),
      brand: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    if (args.productData.availableQuantity < args.quantity) {
      throw new Error(`Apenas ${args.productData.availableQuantity} unidades disponíveis`);
    }

    if (args.quantity <= 0) {
      throw new Error("Quantidade deve ser maior que zero");
    }

    // Buscar carrinho existente
    let cartSession = await ctx.db
      .query("cart_sessions_api")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const now = Date.now();

    if (!cartSession) {
      // Criar novo carrinho
      const cartId = await ctx.db.insert("cart_sessions_api", {
        sessionId: args.sessionId,
        items: [
          {
            externalId: args.externalId,
            quantity: args.quantity,
            unitPrice: args.productData.price,
            productName: args.productData.name,
            productImage: args.productData.image,
            productCategory: args.productData.category,
            productBrand: args.productData.brand,
          },
        ],
        totalItems: args.quantity,
        totalAmount: args.productData.price * args.quantity,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, cartId };
    }

    // Verificar se o produto já está no carrinho
    const existingItemIndex = cartSession.items.findIndex(
      (item) => item.externalId === args.externalId
    );

    let updatedItems;
    let newTotalItems;
    let newTotalValue;

    if (existingItemIndex >= 0) {
      // Atualizar quantidade do item existente
      const existingItem = cartSession.items[existingItemIndex];
      const newQuantity = existingItem.quantity + args.quantity;

      if (args.productData.availableQuantity < newQuantity) {
        throw new Error(`Apenas ${args.productData.availableQuantity} unidades disponíveis`);
      }

      updatedItems = [...cartSession.items];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        unitPrice: args.productData.price, // Atualizar preço
        productName: args.productData.name, // Atualizar dados do produto
        productImage: args.productData.image,
        productCategory: args.productData.category,
        productBrand: args.productData.brand,
      };
    } else {
      // Adicionar novo item
      updatedItems = [
        ...cartSession.items,
        {
          externalId: args.externalId,
          quantity: args.quantity,
          unitPrice: args.productData.price,
          productName: args.productData.name,
          productImage: args.productData.image,
          productCategory: args.productData.category,
          productBrand: args.productData.brand,
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

// Mutation para remover item do carrinho usando externalId
export const removeFromCartByExternalId = mutation({
  args: {
    sessionId: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions_api")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession) {
      throw new Error("Carrinho não encontrado");
    }

    // Filtrar item a ser removido
    const updatedItems = cartSession.items.filter((item) => item.externalId !== args.externalId);

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

// Mutation para atualizar quantidade de um item usando externalId
export const updateCartItemQuantityByExternalId = mutation({
  args: {
    sessionId: v.string(),
    externalId: v.string(),
    quantity: v.number(),
    productData: v.object({
      name: v.string(),
      price: v.number(),
      availableQuantity: v.number(),
      image: v.string(),
      category: v.string(),
      brand: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantidade deve ser maior que zero");
    }

    if (args.productData.availableQuantity < args.quantity) {
      throw new Error(`Apenas ${args.productData.availableQuantity} unidades disponíveis`);
    }

    const cartSession = await ctx.db
      .query("cart_sessions_api")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!cartSession) {
      throw new Error("Carrinho não encontrado");
    }

    // Encontrar e atualizar item
    const itemIndex = cartSession.items.findIndex((item) => item.externalId === args.externalId);

    if (itemIndex === -1) {
      throw new Error("Item não encontrado no carrinho");
    }

    const updatedItems = [...cartSession.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: args.quantity,
      unitPrice: args.productData.price, // Atualizar preço
      productName: args.productData.name, // Atualizar dados do produto
      productImage: args.productData.image,
      productCategory: args.productData.category,
      productBrand: args.productData.brand,
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
export const clearCartAPI = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartSession = await ctx.db
      .query("cart_sessions_api")
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
