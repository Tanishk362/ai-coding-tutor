import "./globals.css";
import "katex/dist/katex.min.css"; // Math rendering styles
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/src/components/QueryProvider";
import { UserMenu } from "@/src/components/UserMenu";

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
        <div className="border-b border-white/10 bg-black/50 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
            <a href="/" className="font-semibold tracking-tight">Institute AI Chatbots</a>
            <UserMenu />
          </div>
        </div>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
