"use client";

import React from "react";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/Button";
import CartItem from "./CartItem";
import { CartSummary } from "./CartSummary";
import { useCartItems, useCartLoading } from "../../stores/cartStore";

interface CartProps {
  className?: string;
}

export function Cart({ className }: CartProps) {
  const items = useCartItems();
  const isLoading = useCartLoading();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Carregando seu carrinho...</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <ShoppingCart className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Seu carrinho está vazio</h2>
        <p className="text-gray-600 text-center mb-6">
          Parece que você ainda não adicionou nenhum produto ao seu carrinho.
        </p>
        <Link href="/produtos">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continuar comprando
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`${className} grid gap-8 md:grid-cols-3`}>
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Seu Carrinho</h2>
          <Link href="/produtos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continuar comprando
            </Button>
          </Link>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          {items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div>
        <CartSummary />
      </div>
    </div>
  );
}
