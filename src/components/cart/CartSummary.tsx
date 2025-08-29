"use client";

import React from "react";
import { ShoppingBag, MessageCircle, AlertTriangle, CreditCard, Smartphone } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "./ProgressBar";
import {
  useCartItems,
  useCartTotal,
  useCartLoading,
  useCartActions,
  useCartItemCount,
} from "@/stores/cartStore";
import { formatPrice, generateWhatsAppMessage, validateBrazilianPhone } from "../../lib/utils";
import { WHATSAPP_SALES_NUMBER, createWhatsAppUrl } from "@/utils/whatsapp";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

type PaymentMethod = "pix" | "card" | null;

interface CartSummaryProps {
  className?: string;
}

export function CartSummary({ className }: CartSummaryProps) {
  const items = useCartItems();
  const totalAmount = useCartTotal();
  const totalItems = useCartItemCount();
  const isLoading = useCartLoading();
  const { clearCart, validateCart } = useCartActions();
  const [isClearing, setIsClearing] = React.useState(false);
  const [isSendingOrder, setIsSendingOrder] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentMethod>(null);
  const [validationResult, setValidationResult] = React.useState<{
    hasIssues: boolean;
    issues: Array<{ message: string }>;
  } | null>(null);

  // Validar carrinho ao carregar
  React.useEffect(() => {
    if (items.length > 0) {
      validateCart()
        .then(setValidationResult)
        .catch((err) => {
          if (DEBUG) console.error("Erro ao validar carrinho:", err);
        });
    }
  }, [items, validateCart]);

  const handleClearCart = async () => {
    if (items.length === 0) return;

    const confirmed = window.confirm("Tem certeza que deseja limpar o carrinho?");
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await clearCart();
    } catch (error) {
      if (DEBUG) console.error("Erro ao limpar carrinho:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSendWhatsAppOrder = async () => {
    if (items.length === 0) return;

    setIsSendingOrder(true);
    try {
      // Validar carrinho antes de enviar
      const validation = await validateCart();

      if (validation.hasIssues) {
        alert(
          "Existem problemas com alguns itens do seu carrinho. Por favor, revise antes de finalizar o pedido."
        );
        setIsSendingOrder(false);
        return;
      }

      // Gerar mensagem do WhatsApp
      const customerName = "Cliente"; // Pode ser obtido de um formulário
      const cartItems = items.map((item) => ({
        name: item.product.name,
        brand: item.product.brand || "Sem marca",
        quantity: item.quantity,
        unitPrice: item.product.price,
      }));
      const message = generateWhatsAppMessage(customerName, cartItems, totalAmount);

      // Usar número configurado da vendedora
      if (!validateBrazilianPhone(WHATSAPP_SALES_NUMBER)) {
        alert("Número do WhatsApp inválido. Entre em contato com o suporte.");
        setIsSendingOrder(false);
        return;
      }

      // Abrir WhatsApp
      const whatsappUrl = createWhatsAppUrl(WHATSAPP_SALES_NUMBER, message);
      window.open(whatsappUrl, "_blank");
    } catch (error) {
      if (DEBUG) console.error("Erro ao enviar pedido:", error);
      alert("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setIsSendingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Seu carrinho está vazio</h3>
          <p className="text-gray-600">Adicione produtos ao carrinho para ver o resumo aqui.</p>
        </CardContent>
      </Card>
    );
  }

  const hasIssues = validationResult?.hasIssues || false;
  const issueCount = validationResult?.issues?.length || 0;

  // Calcular desconto baseado na forma de pagamento
  const getDiscountInfo = () => {
    if (totalAmount < 500) {
      return {
        hasDiscount: false,
        percentage: 0,
        discountAmount: 0,
        finalPrice: totalAmount,
      };
    }

    if (selectedPayment === "pix") {
      return {
        hasDiscount: true,
        percentage: 35,
        discountAmount: totalAmount * 0.35,
        finalPrice: totalAmount * 0.65,
      };
    } else if (selectedPayment === "card") {
      return {
        hasDiscount: true,
        percentage: 30,
        discountAmount: totalAmount * 0.3,
        finalPrice: totalAmount * 0.7,
      };
    }

    return {
      hasDiscount: false,
      percentage: 0,
      discountAmount: 0,
      finalPrice: totalAmount,
    };
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Resumo do Pedido</span>
          <Badge variant="outline">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alertas de validação */}
        {hasIssues && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">
                {issueCount} {issueCount === 1 ? "problema encontrado" : "problemas encontrados"}
              </span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationResult?.issues
                ?.slice(0, 3)
                .map((issue: { message: string }, index: number) => (
                  <li key={index}>• {issue.message}</li>
                ))}
              {issueCount > 3 && <li>• E mais {issueCount - 3} problemas...</li>}
            </ul>
          </div>
        )}

        {/* Barra de Progresso Gamificada */}
        <ProgressBar currentAmount={totalAmount} />

        {/* Seleção de Forma de Pagamento */}
        {totalAmount >= 500 && (
          <div className="space-y-3">
            <div className="bg-green-100 border border-green-300 rounded-md p-3 sm:p-2 text-center">
              <p className="text-sm font-medium text-green-800 mb-2">
                Parabéns! Escolha sua forma de pagamento e ganhe desconto:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPayment("pix")}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  selectedPayment === "pix"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-green-300"
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Smartphone className="w-6 h-6" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">PIX</div>
                    <div className="text-xs font-bold text-green-600">35% OFF</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPayment("card")}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  selectedPayment === "card"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <CreditCard className="w-6 h-6" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Cartão</div>
                    <div className="text-xs font-bold text-blue-600">30% OFF</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Resumo de valores */}
        <div className="space-y-3">
          <div className="flex justify-between text-base sm:text-sm">
            <span className="text-gray-800 font-medium">
              Subtotal ({totalItems} {totalItems === 1 ? "item" : "itens"}):
            </span>
            <span className="font-semibold text-gray-900">{formatPrice(totalAmount)}</span>
          </div>

          {(() => {
            const discountInfo = getDiscountInfo();
            return discountInfo.hasDiscount ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-sm sm:text-sm">
                    Desconto ({discountInfo.percentage}% -{" "}
                    {selectedPayment === "pix" ? "PIX" : "Cartão"}):
                  </span>
                  <span className="font-medium text-sm sm:text-sm">
                    -{formatPrice(discountInfo.discountAmount)}
                  </span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-green-700">Preço original:</span>
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">Você economiza:</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatPrice(discountInfo.discountAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          <hr className="border-gray-200" />

          <div className="border-t pt-3 sm:pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg sm:text-lg font-bold text-gray-900">Total a pagar:</span>
              <div className="text-right">
                {(() => {
                  const discountInfo = getDiscountInfo();
                  return discountInfo.hasDiscount ? (
                    <div className="space-y-1">
                      <div className="text-sm text-gray-500 line-through">
                        {formatPrice(totalAmount)}
                      </div>
                      <div className="text-lg sm:text-lg font-bold text-green-600">
                        {formatPrice(discountInfo.finalPrice)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-lg sm:text-lg font-bold text-gray-900">
                      {formatPrice(totalAmount)}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="text-xs text-gray-700 space-y-1">
          <p>• Frete será calculado via WhatsApp</p>
          <p>• Formas de pagamento: Dinheiro, PIX, Cartão</p>
          <p>• Entrega ou retirada na loja</p>
        </div>

        {/* Ações */}
        <div className="space-y-3 sm:space-y-2">
          <Button
            onClick={handleSendWhatsAppOrder}
            disabled={isLoading || isSendingOrder || hasIssues}
            className="w-full min-h-[48px] sm:min-h-[44px] text-base sm:text-sm font-semibold"
            size="lg"
          >
            {isSendingOrder ? (
              "Enviando..."
            ) : (
              <>
                <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Finalizar via WhatsApp
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleClearCart}
            disabled={isLoading || isClearing}
            className="w-full min-h-[48px] sm:min-h-[44px] text-base sm:text-sm font-medium"
          >
            {isClearing ? "Limpando..." : "Limpar carrinho"}
          </Button>
        </div>

        {/* Informações de contato */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-800 font-medium mb-2">Dúvidas? Entre em contato:</p>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900">+55 67 99601-031</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
