import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 1. Importamos el Toaster correcto de Sonner
import { Toaster } from "@/components/ui/sonner"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        {/* 2. Colocamos el componente aquí */}
        <Toaster position="top-center" richColors /> 
      </body>
    </html>
  );
}