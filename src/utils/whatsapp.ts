export interface WhatsAppOrderData {
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    externalId?: string;
  }>;
  totalAmount: number;
  totalItems: number;
}

export function generateWhatsAppMessage(orderData: WhatsAppOrderData): string {
  const { items, totalAmount, totalItems } = orderData;

  // Cabeçalho da mensagem
  let message = "*Pedido - Distribuidora Mirô*\n\n";

  // Lista de produtos
  message += "*Produtos:*\n";
  items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    message += `${index + 1}. ${item.name}\n`;
    if (item.externalId) {
      message += `   Código: ${item.externalId}\n`;
    }
    message += `   Qtd: ${item.quantity}x | Valor: R$ ${item.price.toFixed(2).replace(".", ",")}\n`;
    message += `   Subtotal: R$ ${itemTotal.toFixed(2).replace(".", ",")}\n\n`;
  });

  // Resumo do pedido
  message += "*Resumo:*\n";
  message += `Total de itens: ${totalItems}\n`;
  message += `Valor total: R$ ${totalAmount.toFixed(2).replace(".", ",")}\n\n`;

  // Informações adicionais
  message += "*Observações:*\n";
  message += "• Frete a calcular\n";
  message += "• Confirmar disponibilidade dos produtos\n";
  message += "• Forma de pagamento a combinar\n\n";

  // Rodapé
  message += "Aguardo confirmação!";

  return message;
}

export function createWhatsAppUrl(phoneNumber: string, message: string): string {
  // Remove caracteres especiais do número de telefone
  const cleanPhone = phoneNumber.replace(/\D/g, "");

  // Codifica a mensagem para URL
  const encodedMessage = encodeURIComponent(message);

  // Retorna a URL do WhatsApp
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Número da Thaynara (vendedora)
export const WHATSAPP_SALES_NUMBER = "556799601031";

export function openWhatsAppOrder(orderData: WhatsAppOrderData): void {
  const message = generateWhatsAppMessage(orderData);
  const whatsappUrl = createWhatsAppUrl(WHATSAPP_SALES_NUMBER, message);

  // Abre o WhatsApp em uma nova aba
  window.open(whatsappUrl, "_blank");
}
