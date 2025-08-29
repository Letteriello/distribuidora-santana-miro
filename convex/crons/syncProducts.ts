import { cronJobs } from "convex/server";
import { api, internal } from "../_generated/api";

const crons = cronJobs();

// TEMPORARIAMENTE DESABILITADO - Sincronização de produtos a cada 6 horas
// crons.interval(
//   "sync products from external API",
//   { hours: 6 }, // A cada 6 horas
//   api.actions.syncProducts.syncProductsFromExternalAPI,
//   {} // Sem argumentos necessários
// );

// TEMPORARIAMENTE DESABILITADO - Sincronização de produtos diária (backup)
// crons.daily(
//   "daily sync products backup",
//   { hourUTC: 2, minuteUTC: 0 }, // 2:00 AM UTC
//   api.actions.syncProducts.syncProductsFromExternalAPI,
//   {}
// );

// Limpeza de logs antigos (semanal)
crons.weekly(
  "cleanup old sync logs",
  { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 }, // Domingo às 3:00 AM UTC
  internal.mutations.syncProducts.cleanupOldLogs,
  { daysToKeep: 30 } // Manter logs dos últimos 30 dias
);

export default crons;
