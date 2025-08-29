// Serviço para mapear nomes de categorias para códigos cd_tpoprd
// Isso permite filtragem mais precisa por categoria

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

interface CategoryMapping {
  name: string;
  code: number;
  normalizedName: string;
}

interface APIProduct {
  cd_tpoprd: number;
  ds_tpoprd: string;
}

// Cache para mapeamentos de categoria
let categoryMappings: CategoryMapping[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Função para normalizar strings para comparação
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Função para buscar e cachear mapeamentos de categoria
export async function fetchCategoryMappings(): Promise<CategoryMapping[]> {
  const now = Date.now();

  // Retornar cache se ainda válido
  if (categoryMappings.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return categoryMappings;
  }

  try {
    const response = await fetch(
      "https://fiscalfacil.com/LojaVirtual/14044/produtos?tamanho_pagina=3000"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const products = data.dados || [];

    // Extrair mapeamentos únicos de categoria
    const mappingMap = new Map<number, CategoryMapping>();

    products.forEach((product: APIProduct) => {
      if (product.cd_tpoprd && product.ds_tpoprd) {
        const code = product.cd_tpoprd;
        const name = product.ds_tpoprd.trim();

        if (!mappingMap.has(code)) {
          mappingMap.set(code, {
            name,
            code,
            normalizedName: normalizeString(name),
          });
        }
      }
    });

    categoryMappings = Array.from(mappingMap.values());
    lastFetchTime = now;

    if (DEBUG) console.log(`Carregados ${categoryMappings.length} mapeamentos de categoria`);
    return categoryMappings;
  } catch (error) {
    if (DEBUG) console.error("Erro ao buscar mapeamentos de categoria:", error);
    return categoryMappings; // Retornar cache antigo em caso de erro
  }
}

// Função para encontrar código da categoria pelo nome
export async function getCategoryCodeByName(categoryName: string): Promise<number | null> {
  if (!categoryName) return null;

  const mappings = await fetchCategoryMappings();
  const normalizedSearch = normalizeString(categoryName);

  const mapping = mappings.find((m) => m.normalizedName === normalizedSearch);
  return mapping ? mapping.code : null;
}

// Função para encontrar nome da categoria pelo código
export async function getCategoryNameByCode(categoryCode: number): Promise<string | null> {
  if (!categoryCode) return null;

  const mappings = await fetchCategoryMappings();
  const mapping = mappings.find((m) => m.code === categoryCode);
  return mapping ? mapping.name : null;
}

// Função para obter todos os mapeamentos (útil para debugging)
export async function getAllCategoryMappings(): Promise<CategoryMapping[]> {
  return await fetchCategoryMappings();
}
