"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Share, SquarePlus, Check } from "lucide-react";
import {
  EVENEMENT_INSTALL_DISPO,
  detecterPlateforme,
  estAppInstallee,
  estSafariIOS,
  type Plateforme,
} from "./installation";

export function EcranInstallation() {
  const [plateforme, setPlateforme] = useState<Plateforme>("android");
  const [onglet, setOnglet] = useState<"android" | "ios">("android");
  const [peutProposer, setPeutProposer] = useState(false);
  const [installee, setInstallee] = useState(false);
  const [safari, setSafari] = useState(true);

  useEffect(() => {
    const p = detecterPlateforme();
    setPlateforme(p);
    setOnglet(p === "ios" ? "ios" : "android");
    setSafari(estSafariIOS());
    setPeutProposer(!!window.__universcenesInstall);
    if (estAppInstallee()) setInstallee(true);

    const dispo = () => setPeutProposer(true);
    const fini = () => setInstallee(true);
    window.addEventListener(EVENEMENT_INSTALL_DISPO, dispo);
    window.addEventListener("appinstalled", fini);
    return () => {
      window.removeEventListener(EVENEMENT_INSTALL_DISPO, dispo);
      window.removeEventListener("appinstalled", fini);
    };
  }, []);

  async function installer() {
    const evt = window.__universcenesInstall;
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setInstallee(true);
    window.__universcenesInstall = null;
    setPeutProposer(false);
  }

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-6 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Logo Les Universcènes" className="h-28 w-28 object-contain" />

      {installee ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-succes/15 text-succes">
            <Check aria-hidden />
          </div>
          <h1 className="font-display text-3xl font-bold">C&apos;est installé !</h1>
          <p className="text-doux">
            Ferme cette page et ouvre l&apos;app <strong className="text-texte">Universcènes</strong> depuis
            l&apos;écran d&apos;accueil de ton téléphone.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-3xl leading-tight font-bold">
              Installe l&apos;app pour <span className="font-medium text-or italic">continuer</span>
            </h1>
            <p className="text-doux">
              L&apos;espace membres des Universcènes s&apos;utilise depuis l&apos;application installée sur ton
              téléphone. C&apos;est gratuit et ça prend 10 secondes.
            </p>
          </div>

          <div role="tablist" aria-label="Type de téléphone" className="flex w-full rounded-full border border-bordure bg-surface p-1">
            {(["android", "ios"] as const).map((o) => (
              <button
                key={o}
                role="tab"
                aria-selected={onglet === o}
                onClick={() => setOnglet(o)}
                className={`h-11 flex-1 rounded-full font-semibold transition ${
                  onglet === o ? "bg-or text-encre" : "text-doux"
                }`}
              >
                {o === "android" ? "Android" : "iPhone"}
              </button>
            ))}
          </div>

          {onglet === "android" ? (
            <div className="flex w-full flex-col gap-3">
              {peutProposer ? (
                <button
                  onClick={installer}
                  className="flex h-14 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white"
                >
                  <Download size={20} aria-hidden /> Installer l&apos;application
                </button>
              ) : (
                <ol className="flex flex-col gap-2 text-left">
                  <Etape n={1}>Ouvre ce lien dans <strong>Chrome</strong></Etape>
                  <Etape n={2}>Touche le menu <strong>⋮</strong> en haut à droite</Etape>
                  <Etape n={3}>Choisis <strong>« Installer l&apos;application »</strong> ou <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong></Etape>
                </ol>
              )}
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3">
              {plateforme === "ios" && !safari && (
                <p className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
                  Tu n&apos;es pas dans Safari. Copie le lien et ouvre-le dans <strong>Safari</strong> pour pouvoir
                  installer l&apos;app.
                </p>
              )}
              <ol className="flex flex-col gap-2 text-left">
                <Etape n={1}>Ouvre ce lien dans <strong>Safari</strong></Etape>
                <Etape n={2}>
                  Touche <Share size={18} className="inline text-or" aria-label="Partager" /> <strong>Partager</strong>
                </Etape>
                <Etape n={3}>
                  Choisis <SquarePlus size={18} className="inline text-or" aria-hidden />{" "}
                  <strong>« Sur l&apos;écran d&apos;accueil »</strong>
                </Etape>
              </ol>
            </div>
          )}
        </>
      )}

      <Link href="/" className="mt-auto text-sm text-or">
        Voir la page publique du club
      </Link>
    </main>
  );
}

function Etape({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-bordure bg-surface p-3.5">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-or font-bold text-encre">{n}</span>
      <span>{children}</span>
    </li>
  );
}
