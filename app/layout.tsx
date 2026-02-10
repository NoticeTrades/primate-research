import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { ThemeProvider } from "./providers/ThemeProvider";
import FeedbackWidget from "./components/FeedbackWidget";

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
    default: "Primate Trading - Market Analysis & Research | Primate Research",
    template: "%s | Primate Trading",
  },
  description: "Primate Trading provides real-time market analysis, weekly research reports, and trading insights across equities, crypto, and macroeconomic trends. Expert analysis for traders and investors.",
  keywords: [
    "primate trading",
    "primate research",
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
    siteName: 'Primate Trading',
    title: 'Primate Trading - Market Analysis & Research',
    description: 'Real-time market analysis, weekly research reports, and trading insights across equities, crypto, and macroeconomic trends.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Primate Trading - Market Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Primate Trading - Market Analysis & Research',
    description: 'Real-time market analysis, weekly research reports, and trading insights.',
    images: ['/og-image.png'],
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
    // Add your Google Search Console verification code here when you get it
    // google: 'your-verification-code',
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
        <ThemeProvider>{children}</ThemeProvider>
        <FeedbackWidget />
        <Analytics />
      </body>
    </html>
  );
}
