import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientProvider from "@/components/providers/ClientProvider";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Distribuidora Mirô - Produtos de Qualidade",
  description:
    "Distribuidora de produtos para empresas e comércios. Qualidade garantida e entrega rápida em Campo Grande - MS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <ClientProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ClientProvider>
      </body>
    </html>
  );
}
