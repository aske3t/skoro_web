import type { Metadata } from "next";
import { Space_Grotesk, Oswald, Inter, Barlow_Condensed } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const display = Oswald ({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  variable: "--font-display",
  display: "swap",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Слоган с визитки («Více než kurýr»). Без кириллицы — только для латинского текста.
const tagline = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["800"],
  style: ["italic"],
  variable: "--font-tagline",
  display: "swap",
  // Без запасного Arial: иначе им наберётся кириллица. Так русские буквы берутся из Oswald,
  // следующего в стеке font-tagline (tailwind.config.ts).
  adjustFontFallback: false,
});

const mono = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skoro — Courier in perpetual motion",
  description:
    "Same-day dispatch across 40+ cities. Real-time positioning. Hand-to-hand provenance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} ${tagline.variable}`}
    >
      <body className="min-h-screen overflow-x-hidden bg-bg font-body text-ink">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
