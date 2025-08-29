import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility para combinar classes CSS com Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatação de preços em Real brasileiro
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

// Formatação de números
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("pt-BR").format(num);
}

// Geração de session ID único para carrinho
export function generateSessionId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Cache para sessionId para evitar chamadas repetitivas
let cachedSessionId: string | null = null;

// Obter ou criar session ID do localStorage com cache
export function getOrCreateSessionId(): string {
  // Se já temos o sessionId em cache, retorna imediatamente
  if (cachedSessionId) {
    return cachedSessionId;
  }

  if (typeof window === "undefined") {
    const tempSessionId = generateSessionId();
    cachedSessionId = tempSessionId;
    return tempSessionId;
  }

  const existingSessionId = localStorage.getItem("cart_session_id");

  if (existingSessionId) {
    cachedSessionId = existingSessionId;
    return existingSessionId;
  }

  const newSessionId = generateSessionId();
  localStorage.setItem("cart_session_id", newSessionId);
  cachedSessionId = newSessionId;
  return newSessionId;
}

// Limpar session ID do localStorage e cache
export function clearSessionId(): void {
  cachedSessionId = null; // Limpar cache
  if (typeof window !== "undefined") {
    localStorage.removeItem("cart_session_id");
  }
}

// Formatação de data/hora
export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

// Formatação de data apenas
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

// Debounce para otimizar buscas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Validação de quantidade
export function validateQuantity(
  quantity: number,
  available: number
): {
  isValid: boolean;
  error?: string;
} {
  if (quantity <= 0) {
    return { isValid: false, error: "Quantidade deve ser maior que zero" };
  }

  if (quantity > available) {
    return {
      isValid: false,
      error: `Apenas ${available} unidades disponíveis`,
    };
  }

  return { isValid: true };
}

// Truncar texto
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "...";
}

// Slugify para URLs amigáveis
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-") // Substitui espaços por hífens
    .replace(/-+/g, "-"); // Remove hífens duplicados
}

// Calcular desconto percentual
export function calculateDiscountPercentage(originalPrice: number, salePrice: number): number {
  if (originalPrice <= 0 || salePrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

// Verificar se é mobile
export function isMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth < 768;
}

// Copiar texto para clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    if (DEBUG) console.error("Erro ao copiar texto:", error);
    return false;
  }
}

// Gerar mensagem do WhatsApp
export function generateWhatsAppMessage(
  customerName: string,
  items: Array<{ name: string; brand: string; quantity: number; unitPrice: number }>,
  totalValue: number
): string {
  const itemsList = items
    .map(
      (item) => `• ${item.quantity}x ${item.name} (${item.brand}) - ${formatPrice(item.unitPrice)}`
    )
    .join("\n");

  return (
    `*Pedido - Distribuidora Mirô*\n\n` +
    `*Cliente:* ${customerName}\n\n` +
    `*Itens:*\n${itemsList}\n\n` +
    `*Total:* ${formatPrice(totalValue)}\n\n` +
    `Entre em contato para finalizar o pedido!`
  );
}

// Validar número de telefone brasileiro
export function validateBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, "");

  // Aceita formatos: 11999999999 ou 1199999999
  return /^\d{10,11}$/.test(cleanPhone);
}

// Formatar número de telefone brasileiro
export function formatBrazilianPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return phone;
}
