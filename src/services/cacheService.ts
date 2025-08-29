// Serviço de cache para dados da API externa

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  version: string;
}

class CacheService {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheItem<unknown>> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      maxSize: 50, // máximo 50 itens no cache de memória
      version: "1.0.0",
      ...config,
    };
  }

  // Gerar chave de cache
  private generateKey(namespace: string, identifier: string): string {
    return `cache_${namespace}_${identifier}`;
  }

  // Verificar se item está expirado
  private isExpired(item: CacheItem<unknown>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  // Verificar se versão é compatível
  private isVersionValid(item: CacheItem<unknown>): boolean {
    return item.version === this.config.version;
  }

  // Buscar do localStorage
  private getFromLocalStorage<T>(key: string): CacheItem<T> | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const item: CacheItem<T> = JSON.parse(stored);

      // Verificar versão e expiração
      if (!this.isVersionValid(item) || this.isExpired(item)) {
        localStorage.removeItem(key);
        return null;
      }

      return item;
    } catch {
      // Falha silenciosa - retorna null se não conseguir fazer parse
      return null;
    }
  }

  // Salvar no localStorage
  private setToLocalStorage<T>(key: string, item: CacheItem<T>): void {
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      if (DEBUG) console.warn(`Erro ao salvar cache no localStorage:`, error);
      // Se localStorage está cheio, tentar limpar cache antigo
      this.clearExpiredFromLocalStorage();
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch (retryError) {
        if (DEBUG) console.error(`Falha ao salvar no localStorage após limpeza:`, retryError);
      }
    }
  }

  // Limpar itens expirados do localStorage
  private clearExpiredFromLocalStorage(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cache_")) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const item: CacheItem<unknown> = JSON.parse(stored);
            if (!this.isVersionValid(item) || this.isExpired(item)) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  // Gerenciar tamanho do cache de memória
  private manageMemoryCacheSize(): void {
    if (this.memoryCache.size >= this.config.maxSize) {
      // Remover itens mais antigos
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remover 25% dos itens mais antigos
      const toRemove = Math.floor(this.config.maxSize * 0.25);
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }
  }

  // Buscar item do cache
  get<T>(namespace: string, identifier: string): T | null {
    const key = this.generateKey(namespace, identifier);

    // Primeiro, verificar cache de memória
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && !this.isExpired(memoryItem) && this.isVersionValid(memoryItem)) {
      return memoryItem.data as T;
    }

    // Se não encontrou na memória, verificar localStorage
    const localItem = this.getFromLocalStorage<T>(key);
    if (localItem) {
      // Adicionar ao cache de memória para acesso mais rápido
      this.memoryCache.set(key, localItem);
      return localItem.data;
    }

    return null;
  }

  // Salvar item no cache
  set<T>(namespace: string, identifier: string, data: T, ttl?: number): void {
    const key = this.generateKey(namespace, identifier);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      version: this.config.version,
    };

    // Gerenciar tamanho do cache de memória
    this.manageMemoryCacheSize();

    // Salvar em ambos os caches
    this.memoryCache.set(key, item);
    this.setToLocalStorage(key, item);
  }

  // Remover item específico
  remove(namespace: string, identifier: string): void {
    const key = this.generateKey(namespace, identifier);
    this.memoryCache.delete(key);
    localStorage.removeItem(key);
  }

  // Limpar todo o cache de um namespace
  clearNamespace(namespace: string): void {
    const prefix = `cache_${namespace}_`;

    // Limpar cache de memória
    const memoryKeys = Array.from(this.memoryCache.keys());
    memoryKeys.forEach((key) => {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    });

    // Limpar localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  // Limpar todo o cache
  clearAll(): void {
    this.memoryCache.clear();

    // Limpar apenas itens de cache do localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  // Obter estatísticas do cache
  getStats() {
    let localStorageCount = 0;
    let localStorageSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cache_")) {
        localStorageCount++;
        const value = localStorage.getItem(key);
        if (value) {
          localStorageSize += value.length;
        }
      }
    }

    return {
      memoryCache: {
        size: this.memoryCache.size,
        maxSize: this.config.maxSize,
      },
      localStorage: {
        count: localStorageCount,
        sizeBytes: localStorageSize,
      },
      config: this.config,
    };
  }

  // Verificar se um item existe no cache (sem retornar os dados)
  has(namespace: string, identifier: string): boolean {
    return this.get(namespace, identifier) !== null;
  }

  // Atualizar TTL de um item existente
  updateTTL(namespace: string, identifier: string, newTTL: number): boolean {
    const key = this.generateKey(namespace, identifier);

    // Verificar cache de memória
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      memoryItem.ttl = newTTL;
      memoryItem.timestamp = Date.now(); // Reset timestamp
      this.setToLocalStorage(key, memoryItem);
      return true;
    }

    // Verificar localStorage
    const localItem = this.getFromLocalStorage(key);
    if (localItem) {
      localItem.ttl = newTTL;
      localItem.timestamp = Date.now(); // Reset timestamp
      this.memoryCache.set(key, localItem);
      this.setToLocalStorage(key, localItem);
      return true;
    }

    return false;
  }
}

// Instância singleton do serviço de cache
export const cacheService = new CacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxSize: 100,
  version: "1.0.0",
});

// Namespaces específicos para diferentes tipos de dados
export const CACHE_NAMESPACES = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  BRANDS: "brands",
  PRODUCT_DETAILS: "product_details",
} as const;

export type CacheNamespace = (typeof CACHE_NAMESPACES)[keyof typeof CACHE_NAMESPACES];
