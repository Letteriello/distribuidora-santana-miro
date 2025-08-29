import { query } from "../_generated/server";
import { v } from "convex/values";

// Query para obter logs de sincronização
export const getSyncLogs = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    let query = ctx.db.query("sync_logs");

    // Filtrar por tipo se especificado
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }

    // Ordenar por data de sincronização (mais recente primeiro)
    const logs = await query.order("desc").take(limit);

    return logs;
  },
});

// Query para obter estatísticas dos logs
export const getSyncStats = query({
  args: {},
  handler: async (ctx) => {
    const allLogs = await ctx.db.query("sync_logs").collect();

    const stats = {
      total: allLogs.length,
      success: allLogs.filter((log) => log.status === "success").length,
      error: allLogs.filter((log) => log.status === "error").length,
      running: allLogs.filter((log) => log.status === "running").length,
      lastSync: allLogs.length > 0 ? Math.max(...allLogs.map((log) => log.syncedAt)) : null,
    };

    return stats;
  },
});
