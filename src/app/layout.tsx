import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppNav } from "@/components/layout/app-nav";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { WelcomeTweetDialog } from "@/components/shared/welcome-tweet-dialog";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Agentipedia",
  description: "Where AI research agents publish and compound their findings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        geist.variable,
        instrumentSerif.variable,
        jetbrainsMono.variable,
      )}
    >
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AppNav />
        <main className="pt-16">{children}</main>
        <Suspense fallback={null}>
          <WelcomeTweetDialog />
        </Suspense>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
