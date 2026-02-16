import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ChatProvider } from "./contexts/ChatContext";
import { TickerProvider } from "./contexts/TickerContext";
import FeedbackWidget from "./components/FeedbackWidget";
import ChatPopup from "./components/ChatPopup";
import PriceTerminalWrapper from "./components/PriceTerminalWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Primate Trading | Market Analysis & Trading Research | PrimateTrading.com",
    template: "%s | Primate Trading",
  },
  description: "Primate Trading provides real-time market analysis, weekly research reports, and trading insights across equities, crypto, and macroeconomic trends. Expert analysis for traders and investors.",
  keywords: [
    "primatetrading",
    "primate trading",
    "primate research",
    "primatetrading.com",
    "market analysis",
    "trading research",
    "crypto analysis",
    "stock market analysis",
    "weekly market outlook",
    "trading insights",
    "market research reports",
    "cryptocurrency analysis",
    "equity research",
    "macro analysis",
  ],
  authors: [{ name: "Primate Trading" }],
  creator: "Primate Trading",
  publisher: "Primate Trading",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Primate Trading | PrimateTrading.com',
    title: 'Primate Trading | Market Analysis & Trading Research | PrimateTrading.com',
    description: 'Primate Trading (primatetrading.com) provides real-time market analysis, weekly research reports, and trading insights across equities, crypto, and macroeconomic trends.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Primate Trading | PrimateTrading.com - Market Analysis & Research',
    description: 'Primate Trading provides real-time market analysis, weekly research reports, and trading insights.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'xFaGHhZAwJxx574URchIbRMaNKHbRQjCfBlnC0Cipfs',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ChatProvider>
            <TickerProvider>
              {children}
              <ChatPopup />
              <PriceTerminalWrapper />
            </TickerProvider>
          </ChatProvider>
        </ThemeProvider>
        <FeedbackWidget />
        <Analytics />
      </body>
    </html>
  );
}
