import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Mutation interna para processar os produtos
export const processExternalProducts = internalMutation({
  args: {
    products: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Processando ${args.products.length} produtos...`);

      const CHUNK_SIZE = 50;
      let processed = 0;
      let created = 0;
      let updated = 0;
      let errors = 0;
      const errorMessages: string[] = [];
      const categoryCache = new Map<string, boolean>();

      // Dividir produtos em chunks para evitar timeouts
      const chunks = [];
      for (let i = 0; i < args.products.length; i += CHUNK_SIZE) {
        chunks.push(args.products.slice(i, i + CHUNK_SIZE));
      }

      // Aplicar filtros de deduplicação e produtos com foto ANTES do processamento
      console.log(`Aplicando filtros de deduplicação e produtos com foto...`);

      // 1. Filtrar apenas produtos com foto (ds_temfoto='S' e ds_imagem válida)
      const productsWithPhoto = args.products.filter((product: any) => {
        return (
          product.ds_temfoto === "S" &&
          product.ds_imagem &&
          product.ds_imagem.trim() !== "" &&
          product.ds_imagem !== "null" &&
          product.ds_imagem !== "undefined"
        );
      });

      console.log(
        `Produtos filtrados por foto: ${productsWithPhoto.length} de ${args.products.length} produtos`
      );

      // 2. Deduplicação por cd_prd (ID único do produto)
      const uniqueProductsMap = new Map<string, any>();
      const duplicatesFound: string[] = [];

      for (const product of productsWithPhoto) {
        const productId = product.cd_prd?.toString();
        if (!productId) continue;

        if (uniqueProductsMap.has(productId)) {
          duplicatesFound.push(productId);
          // Manter o produto mais recente ou com mais informações
          const existing = uniqueProductsMap.get(productId);
          const current = product;

          // Critério: produto com mais informações (descrição, marca, etc.)
          const existingScore =
            (existing.ds_obssite?.length || 0) + (existing.ds_marca?.length || 0);
          const currentScore = (current.ds_obssite?.length || 0) + (current.ds_marca?.length || 0);

          if (currentScore > existingScore) {
            uniqueProductsMap.set(productId, current);
          }
        } else {
          uniqueProductsMap.set(productId, product);
        }
      }

      const uniqueProducts = Array.from(uniqueProductsMap.values());
      console.log(
        `Deduplicação concluída: ${uniqueProducts.length} produtos únicos (${duplicatesFound.length} duplicatas removidas)`
      );

      if (duplicatesFound.length > 0) {
        console.log(
          `IDs duplicados encontrados: ${duplicatesFound.slice(0, 10).join(", ")}${duplicatesFound.length > 10 ? "..." : ""}`
        );
      }

      // Dividir produtos únicos em chunks para processamento
      const productChunks = [];
      for (let i = 0; i < uniqueProducts.length; i += 50) {
        productChunks.push(uniqueProducts.slice(i, i + 50));
      }

      // Processar cada chunk
      for (let chunkIndex = 0; chunkIndex < productChunks.length; chunkIndex++) {
        const chunk = productChunks[chunkIndex];
        console.log(
          `Processando chunk ${chunkIndex + 1}/${productChunks.length} com ${chunk.length} produtos únicos com foto...`
        );

        // Buscar todos os produtos existentes do chunk de uma vez
        const externalIds = chunk.map((p: any) => p.cd_prd?.toString()).filter(Boolean);
        const existingProducts = await ctx.db
          .query("products")
          .withIndex("by_external_id")
          .collect();

        const existingProductsMap = new Map(
          existingProducts
            .filter((p: any) => externalIds.includes(p.externalId))
            .map((p: any) => [p.externalId, p])
        );

        for (const product of chunk) {
          try {
            // Validação de dados obrigatórios
            if (!product.cd_prd || !product.nm_prd) {
              errors++;
              errorMessages.push(`Produto sem ID ou nome: ${product.cd_prd || "N/A"}`);
              continue;
            }

            // Filtrar produtos da categoria 'Reutilizar'
            if (product.ds_tpoprd === "REUTILIZAR") {
              console.log(`Produto ${product.cd_prd} ignorado - categoria 'REUTILIZAR'`);
              continue;
            }

            // Buscar produto existente
            const existingProduct = existingProductsMap.get(product.cd_prd.toString());

            // Mapear dados do produto (já filtrado para ter foto)
            const productData = {
              externalId: product.cd_prd.toString(),
              name: product.nm_prd,
              image: product.ds_imagem, // Garantido que existe e é válido
              price: parseFloat(product.vl_vnd) || 0,
              availableQuantity: parseInt(product.qt_disponivel) || 0,
              category: product.ds_tpoprd,
              brand: product.ds_marca || "",
              unit: product.cd_un || "UN",
              description: product.ds_obssite || "",
              isActive: true,
              isPromotion: false,
              promotionPrice: undefined,
              discountPercent: parseFloat(product.vl_percdesconto) || undefined,
              hasPhoto: true, // Sempre true pois já foi filtrado
              lastSyncAt: Date.now(),
            };

            if (existingProduct) {
              // Atualizar produto existente
              await ctx.db.patch(existingProduct._id, productData);
              updated++;
            } else {
              // Criar novo produto
              await ctx.db.insert("products", productData);
              created++;
            }

            // Gerenciar categoria
            if (productData.category && productData.category !== "Sem categoria") {
              if (!categoryCache.has(productData.category)) {
                const existingCategory = await ctx.db
                  .query("categories")
                  .filter((q: any) => q.eq(q.field("name"), productData.category))
                  .first();

                if (!existingCategory) {
                  await ctx.db.insert("categories", {
                    name: productData.category,
                    productCount: 0,
                    isActive: true,
                  });
                }
                categoryCache.set(productData.category, true);
              }
            }

            processed++;
          } catch (error) {
            console.error(`Erro ao processar produto ${product.id}:`, error);
            errors++;
            errorMessages.push(`Produto ${product.id}: ${(error as Error).message}`);
          }
        }

        // Chunk processado com sucesso
      }

      // Log do resultado
      await ctx.db.insert("sync_logs", {
        type: "products",
        status: "success",
        recordsProcessed: processed,
        syncedAt: Date.now(),
      });

      console.log(
        `Sincronização concluída: ${processed} processados, ${created} criados, ${updated} atualizados, ${errors} erros`
      );
      console.log(
        `Filtros aplicados: ${args.products.length} produtos originais → ${uniqueProducts.length} produtos únicos com foto`
      );

      return {
        success: true,
        processed,
        created,
        updated,
        errors,
        errorMessages: errorMessages.slice(0, 5),
        batchSize: args.products.length,
        filteredProducts: uniqueProducts.length,
        duplicatesRemoved: duplicatesFound.length,
        chunksProcessed: productChunks.length,
      };
    } catch (error) {
      console.error("Erro no processamento de produtos:", error);
      throw error;
    }
  },
});

// Mutation para reativar todos os produtos
export const reactivateAllProducts = mutation({
  args: {},
  handler: async (ctx: any) => {
    try {
      console.log("Reativando todos os produtos...");

      // Buscar todos os produtos inativos
      const inactiveProducts = await ctx.db
        .query("products")
        .filter((q: any) => q.eq(q.field("isActive"), false))
        .collect();

      let reactivatedCount = 0;

      // Reativar todos os produtos
      for (const product of inactiveProducts) {
        await ctx.db.patch(product._id, {
          isActive: true,
          lastSyncAt: Date.now(),
        });
        reactivatedCount++;
      }

      console.log(`Reativação concluída: ${reactivatedCount} produtos reativados`);

      return {
        success: true,
        reactivatedCount,
      };
    } catch (error) {
      console.error("Erro na reativação de produtos:", error);
      throw error;
    }
  },
});

// Mutation para desativar produtos antigos que não foram sincronizados
export const deactivateOldProducts = internalMutation({
  args: {
    syncStartTime: v.number(),
  },
  handler: async (ctx: any, { syncStartTime }: { syncStartTime: number }) => {
    try {
      console.log("Iniciando desativação de produtos antigos...");

      let deactivatedCount = 0;
      let hasMore = true;
      const batchSize = 100; // Processar em lotes menores

      while (hasMore) {
        // Buscar produtos que não foram atualizados na sincronização atual (em lotes)
        const oldProducts = await ctx.db
          .query("products")
          .filter((q: any) =>
            q.and(q.eq(q.field("isActive"), true), q.lt(q.field("lastSyncAt"), syncStartTime))
          )
          .take(batchSize);

        if (oldProducts.length === 0) {
          hasMore = false;
          break;
        }

        // Desativar produtos antigos do lote atual
        for (const product of oldProducts) {
          await ctx.db.patch(product._id, {
            isActive: false,
            lastSyncAt: Date.now(),
          });
          deactivatedCount++;
        }

        console.log(
          `Lote processado: ${oldProducts.length} produtos desativados (Total: ${deactivatedCount})`
        );

        // Se o lote retornou menos que o tamanho máximo, não há mais produtos
        if (oldProducts.length < batchSize) {
          hasMore = false;
        }
      }

      console.log(`Desativação concluída: ${deactivatedCount} produtos desativados`);

      return {
        success: true,
        deactivatedCount,
      };
    } catch (error) {
      console.error("Erro na desativação de produtos antigos:", error);
      throw error;
    }
  },
});

// Mutation para limpeza de logs antigos
export const cleanupOldLogs = internalMutation({
  args: {
    daysToKeep: v.number(),
  },
  handler: async (ctx: any, { daysToKeep }: { daysToKeep: number }) => {
    try {
      const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      // Buscar logs antigos
      const oldLogs = await ctx.db
        .query("sync_logs")
        .filter((q: any) => q.lt(q.field("syncedAt"), cutoffDate))
        .collect();

      // Deletar logs antigos
      let deletedCount = 0;
      for (const log of oldLogs) {
        await ctx.db.delete(log._id);
        deletedCount++;
      }

      console.log(`Limpeza de logs concluída: ${deletedCount} logs removidos`);

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      console.error("Erro na limpeza de logs:", error);
      throw error;
    }
  },
});
