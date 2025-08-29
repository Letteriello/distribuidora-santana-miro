"use client";

// Convex temporariamente desabilitado devido ao limite do plano gratuito
// import { ConvexProvider } from "convex/react";
// import { convex } from "@/lib/convex";

interface ClientProviderProps {
  children: React.ReactNode;
}

export default function ClientProvider({ children }: ClientProviderProps) {
  // Retorna apenas os children sem o ConvexProvider até resolver o plano
  return <>{children}</>;
}
