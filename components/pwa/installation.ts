"use client";

/** Événement Chrome/Android qui permet d'afficher la vraie fenêtre « Installer ». */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __universcenesInstall?: BeforeInstallPromptEvent | null;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

export const EVENEMENT_INSTALL_DISPO = "universcenes:install-dispo";

/** L'app est-elle ouverte depuis l'icône de l'écran d'accueil ? */
export function estAppInstallee(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

export type Plateforme = "ios" | "android" | "ordinateur";

export function detecterPlateforme(): Plateforme {
  if (typeof navigator === "undefined") return "ordinateur";
  const ua = navigator.userAgent;
  // iPadOS se présente comme un Mac : on le repère à l'écran tactile.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "ordinateur";
}

/** Sur iPhone, seule Safari sait installer une app web. */
export function estSafariIOS(): boolean {
  const ua = navigator.userAgent;
  return detecterPlateforme() === "ios" && !/CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV/i.test(ua);
}
