import type { MetadataRoute } from "next";

/** Manifest de l'app installable (PWA) : servi sur /manifest.webmanifest */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/espace",
    name: "Les Universcènes",
    short_name: "Universcènes",
    description: "Espace membres du club Théâtre & Cinéma Universiapolis",
    lang: "fr",
    start_url: "/espace?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0d0c",
    theme_color: "#0e0d0c",
    categories: ["education", "entertainment", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
