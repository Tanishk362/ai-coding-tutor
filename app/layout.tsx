import "./globals.css";
import "katex/dist/katex.min.css"; // Math rendering styles
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/src/components/QueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tarik Learing",
  description: "Learn coding with your AI Tutor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
