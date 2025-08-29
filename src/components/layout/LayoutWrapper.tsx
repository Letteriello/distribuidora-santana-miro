"use client";

import { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import CartSidebar from "../cart/CartSidebar";
import ConnectivityStatus from "../ui/ConnectivityStatus";
import { useCartCrossTabSync } from "../../hooks/useCartSync";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Ativa a sincronização do carrinho entre abas
  useCartCrossTabSync();

  const handleCartClose = () => setIsCartOpen(false);
  const handleCartOpen = () => setIsCartOpen(true);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartOpen={handleCartOpen} />

      <main className="flex-1">{children}</main>

      <Footer />

      <CartSidebar isOpen={isCartOpen} onClose={handleCartClose} />

      {/* Status de conectividade global */}
      <ConnectivityStatus showDetails={false} />
    </div>
  );
}
