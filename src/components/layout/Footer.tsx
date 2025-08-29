import { Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { createWhatsAppUrl, WHATSAPP_SALES_NUMBER } from "@/utils/whatsapp";

export default function Footer() {
  return (
    <footer className="bg-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Distribuidora Mirô</h3>
            <p className="text-primary-100 text-sm leading-relaxed">
              Há mais de 30 anos no mercado.
            </p>
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">M</span>
              </div>
              <div>
                <p className="font-medium">Qualidade Garantida</p>
                <p className="text-xs text-primary-200">Produtos selecionados</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary-300" />
                <div>
                  <p className="text-sm font-medium">(67) 99601-031</p>
                  <p className="text-xs text-primary-200">Thaynara - Vendas</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-primary-300" />
                <div>
                  <p className="text-sm">Campo Grande - MS</p>
                  <p className="text-xs text-primary-200">Atendemos todo o estado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Horário de Atendimento</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-primary-300" />
                <div>
                  <p className="text-sm font-medium">Segunda a Sexta</p>
                  <p className="text-xs text-primary-200">8h às 18h</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-primary-300" />
                <div>
                  <p className="text-sm font-medium">Sábado</p>
                  <p className="text-xs text-primary-200">8h às 12h</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-primary-700 rounded-lg">
                <p className="text-xs text-primary-100">
                  WhatsApp disponível 24h para pedidos urgentes
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Links Rápidos</h4>
            <div className="space-y-2">
              <a
                href="#"
                className="block text-sm text-primary-200 hover:text-white transition-colors"
              >
                Catálogo de Produtos
              </a>
              <a
                href="#"
                className="block text-sm text-primary-200 hover:text-white transition-colors"
              >
                Ofertas Especiais
              </a>
              <a
                href="#"
                className="block text-sm text-primary-200 hover:text-white transition-colors"
              >
                Política de Entrega
              </a>
              <a
                href="#"
                className="block text-sm text-primary-200 hover:text-white transition-colors"
              >
                Formas de Pagamento
              </a>
              <a
                href="#"
                className="block text-sm text-primary-200 hover:text-white transition-colors"
              >
                Fale Conosco
              </a>
            </div>

            {/* WhatsApp CTA */}
            <div className="mt-4">
              <button
                onClick={() => {
                  const message =
                    "Olá! Gostaria de conhecer os produtos da Distribuidora Mirô e fazer um pedido.";
                  const whatsappUrl = createWhatsAppUrl(WHATSAPP_SALES_NUMBER, message);
                  window.open(whatsappUrl, "_blank");
                }}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Fale Conosco no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-primary-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-primary-200">
              © 2025 Distribuidora Mirô. Todos os direitos reservados.
            </div>
            <div className="flex items-center space-x-6 text-sm text-primary-200">
              <span>CNPJ: 10.528.268/0001-54</span>
              <span>•</span>
              <span>Produtos com garantia</span>
              <span>•</span>
              <span>Consultar sobre Entregas</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
