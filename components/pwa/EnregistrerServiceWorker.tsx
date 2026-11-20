"use client";

import { useEffect } from "react";
import { EVENEMENT_INSTALL_DISPO, type BeforeInstallPromptEvent } from "./installation";

/** Enregistre le service worker et garde de côté la proposition d'installation d'Android. */
export function EnregistrerServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    const surProposition = (e: Event) => {
      e.preventDefault(); // on affichera notre propre bouton « Installer »
      window.__universcenesInstall = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event(EVENEMENT_INSTALL_DISPO));
    };
    const surInstallee = () => {
      window.__universcenesInstall = null;
    };

    window.addEventListener("beforeinstallprompt", surProposition);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
      window.removeEventListener("beforeinstallprompt", surProposition);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  return null;
}
