"use client";

import { useEffect, useState } from "react";
import { EXIGER_INSTALLATION } from "@/lib/config";
import { estAppInstallee } from "./installation";
import { EcranInstallation } from "./EcranInstallation";

/**
 * Sur téléphone : si l'app n'est pas ouverte depuis l'icône installée,
 * on affiche l'écran d'installation à la place du contenu.
 * Sur ordinateur (détecté par le serveur) : le contenu s'affiche directement.
 */
export function BarriereInstallation({ mobile, children }: { mobile: boolean; children: React.ReactNode }) {
  const controler = EXIGER_INSTALLATION && mobile;
  const [etat, setEtat] = useState<"verif" | "ok" | "bloque">(controler ? "verif" : "ok");

  useEffect(() => {
    if (controler) setEtat(estAppInstallee() ? "ok" : "bloque");
  }, [controler]);

  if (etat === "verif") return <div className="min-h-dvh bg-fond" aria-busy="true" />;
  if (etat === "bloque") return <EcranInstallation />;
  return <>{children}</>;
}
