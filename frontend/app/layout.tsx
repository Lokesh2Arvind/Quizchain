import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';

const primarySans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

const secondaryMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "QuizChain - Blockchain Quiz Game",
  description: "Decentralized quiz game powered by Yellow SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${primarySans.variable} ${secondaryMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        <Providers>
          <div className="min-h-screen bg-slate-950">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
