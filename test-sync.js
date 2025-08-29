// Script para testar sincronização de produtos
const { ConvexHttpClient } = require("convex/browser");

// URL do Convex (ajustar conforme necessário)
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-convex-deployment.convex.cloud";

async function testSync() {
  try {
    console.log("Iniciando teste de sincronização...");

    const client = new ConvexHttpClient(CONVEX_URL);

    // Chamar a action de sincronização
    const result = await client.action("actions/syncProducts:syncProductsFromExternalAPI", {});

    console.log("Resultado da sincronização:", result);
  } catch (error) {
    console.error("Erro no teste de sincronização:", error);
  }
}

testSync();
