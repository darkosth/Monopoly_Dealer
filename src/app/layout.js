import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// 1. Usamos Outfit: una fuente geométrica, redondeada y moderna
const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"], // Pesos gruesos para que los saldos resalten
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Monopoly Bank",
  description: "Real-time Monopoly transactions",
};

export default function RootLayout({ children }) {
  return (
    // 2. Agregamos className="dark" para forzar el modo oscuro de Shadcn
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        {/* 3. Forzamos el tema oscuro en las notificaciones para que combinen */}
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}