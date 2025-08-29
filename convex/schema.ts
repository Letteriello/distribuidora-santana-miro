import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    externalId: v.string(), // cd_prd da API externa (convertido para string)
    name: v.string(), // nm_prd
    image: v.string(), // ds_imagem
    price: v.number(), // vl_vnd
    availableQuantity: v.number(), // qt_disponivel
    category: v.string(), // ds_tpoprd
    brand: v.string(), // ds_marca
    unit: v.string(), // cd_un
    description: v.optional(v.string()),
    isActive: v.boolean(),
    isPromotion: v.optional(v.boolean()), // ds_promocao === "S"
    promotionPrice: v.optional(v.number()), // vl_promocao
    discountPercent: v.optional(v.number()), // vl_percdesconto
    hasPhoto: v.optional(v.boolean()), // ds_temfoto === "S"
    lastSyncAt: v.number(), // timestamp da última sincronização
  })
    .index("by_external_id", ["externalId"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  categories: defineTable({
    name: v.string(),
    productCount: v.number(),
    isActive: v.boolean(),
  }).index("by_active", ["isActive"]),

  cart_sessions: defineTable({
    sessionId: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPrice: v.number(),
      })
    ),
    totalItems: v.number(),
    totalAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  cart_sessions_api: defineTable({
    sessionId: v.string(),
    items: v.array(
      v.object({
        externalId: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        productName: v.string(),
        productImage: v.string(),
        productCategory: v.string(),
        productBrand: v.string(),
      })
    ),
    totalItems: v.number(),
    totalAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  sync_logs: defineTable({
    type: v.string(), // "products", "categories"
    status: v.string(), // "success", "error"
    recordsProcessed: v.number(),
    errorMessage: v.optional(v.string()),
    syncedAt: v.number(),
  }).index("by_type_and_date", ["type", "syncedAt"]),
});
