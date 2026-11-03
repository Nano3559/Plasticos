import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planta Bolsas y Reciclado",
  description: "Sistema Integral de Operaciones, Pesaje y Costos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
