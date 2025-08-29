"use client";

import React from "react";
import { Trophy, Target, Zap, Gift } from "lucide-react";
import { formatPrice } from "../../lib/utils";

interface ProgressBarProps {
  currentAmount: number;
  targetAmount?: number;
  className?: string;
}

export function ProgressBar({
  currentAmount,
  targetAmount = 500,
  className = "",
}: ProgressBarProps) {
  const progress = Math.min((currentAmount / targetAmount) * 100, 100);
  const remaining = Math.max(targetAmount - currentAmount, 0);
  const isComplete = currentAmount >= targetAmount;

  const getProgressColor = () => {
    if (isComplete) return "from-green-400 to-green-600";
    if (progress > 75) return "from-yellow-400 to-orange-500";
    if (progress > 50) return "from-blue-400 to-blue-600";
    return "from-purple-400 to-pink-500";
  };

  const getMotivationalMessage = () => {
    if (isComplete) {
      return {
        icon: <Trophy className="w-5 h-5 text-yellow-500" />,
        title: "🎉 Parabéns! Desconto Desbloqueado!",
        subtitle: "Escolha sua forma de pagamento e economize até 35%",
        bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
        borderColor: "border-green-200",
      };
    }

    if (progress > 75) {
      return {
        icon: <Zap className="w-5 h-5 text-orange-500" />,
        title: "🔥 Quase lá! Falta pouco!",
        subtitle: `Adicione apenas ${formatPrice(remaining)} para desbloquear os descontos`,
        bgColor: "bg-gradient-to-r from-orange-50 to-yellow-50",
        borderColor: "border-orange-200",
      };
    }

    if (progress > 50) {
      return {
        icon: <Target className="w-5 h-5 text-blue-500" />,
        title: "💪 Você está no caminho certo!",
        subtitle: `Faltam ${formatPrice(remaining)} para desbloquear os preços de atacado`,
        bgColor: "bg-gradient-to-r from-blue-50 to-indigo-50",
        borderColor: "border-blue-200",
      };
    }

    return {
      icon: <Gift className="w-5 h-5 text-purple-500" />,
      title: "🎯 Comece sua jornada para o desconto!",
      subtitle: `Adicione ${formatPrice(remaining)} e ganhe até 35% de desconto`,
      bgColor: "bg-gradient-to-r from-purple-50 to-pink-50",
      borderColor: "border-purple-200",
    };
  };

  const message = getMotivationalMessage();

  return (
    <div className={`${message.bgColor} ${message.borderColor} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-shrink-0">{message.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-gray-800 leading-tight">{message.title}</h3>
          <p className="text-xs text-gray-600 leading-tight">{message.subtitle}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-700 font-medium">{formatPrice(currentAmount)}</span>
          <span className="text-gray-600">{progress.toFixed(0)}%</span>
          <span className="text-gray-700 font-bold">{formatPrice(targetAmount)}</span>
        </div>

        <div className="relative">
          <div className="w-full bg-white/60 rounded-full h-2">
            <div
              className={`h-2 bg-gradient-to-r ${getProgressColor()} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {!isComplete && (
        <div className="mt-2 pt-2 border-t border-white/30">
          <div className="flex justify-center gap-4 text-center">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-green-700">PIX:</span>
              <span className="text-xs text-green-600 font-semibold">35% OFF</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-blue-700">Cartão:</span>
              <span className="text-xs text-blue-600 font-semibold">30% OFF</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
