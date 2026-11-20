import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Playfair_Display } from "next/font/google";
import { EnregistrerServiceWorker } from "@/components/pwa/EnregistrerServiceWorker";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const montserrat = Montserrat({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Les Universcènes", template: "%s · Les Universcènes" },
  description: "Club Théâtre & Cinéma Universiapolis — espace membres.",
  applicationName: "Universcènes",
  appleWebApp: { capable: true, title: "Universcènes", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0e0d0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh bg-fond font-sans text-texte antialiased">
        {children}
        <EnregistrerServiceWorker />
      </body>
    </html>
  );
}
