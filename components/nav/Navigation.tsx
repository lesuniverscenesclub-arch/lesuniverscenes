"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Lock } from "lucide-react";
import type { SectionNav } from "@/lib/roles";
import { Icone } from "./Icone";
import { Avatar } from "./Avatar";

interface Utilisateur {
  prenom: string;
  nom: string;
  avatar_url: string | null;
  libelle: string;
}

function estActif(pathname: string, href: string) {
  return href === "/espace" ? pathname === "/espace" : pathname === href || pathname.startsWith(href + "/");
}

/** Barre latérale (ordinateur / tablette) : contenu dépendant du rôle. */
export function BarreLaterale({ sections, utilisateur }: { sections: SectionNav[]; utilisateur: Utilisateur }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navigation"
      className="sticky top-0 hidden h-dvh w-[272px] flex-none flex-col gap-6 overflow-y-auto border-r border-bordure bg-fond-2 px-4 py-6 md:flex"
    >
      <Link href="/espace" className="flex items-center gap-2.5 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
        <span className="font-display text-xl font-bold">Universcènes</span>
      </Link>

      {sections.map((section, i) => (
        <nav key={section.titre} className={`flex flex-col gap-0.5 ${i > 0 ? "border-t border-bordure pt-5" : ""}`}>
          <span
            className={`flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase ${
              i > 0 ? "text-or" : "text-muet"
            }`}
          >
            {i > 0 && <Lock size={11} aria-hidden />}
            {section.titre}
          </span>
          {section.liens.map((lien) => {
            const actif = estActif(pathname, lien.href);
            return (
              <Link
                key={lien.href}
                href={lien.href}
                aria-current={actif ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-2.5 font-medium transition ${
                  actif ? "bg-surface-2 text-texte" : "text-doux hover:bg-surface hover:text-texte"
                }`}
              >
                <Icone nom={lien.icone} />
                <span className="flex-1">{lien.label}</span>
              </Link>
            );
          })}
        </nav>
      ))}

      <div className="mt-auto flex items-center gap-2.5 border-t border-bordure px-2 pt-4">
        <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} chemin={utilisateur.avatar_url} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">
            {utilisateur.prenom} {utilisateur.nom}
          </span>
          <span className="truncate text-xs text-muet">{utilisateur.libelle}</span>
        </div>
        <form action="/auth/deconnexion" method="post">
          <button
            aria-label="Se déconnecter"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muet hover:bg-surface hover:text-texte"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}

/**
 * Barre du bas (téléphone). Les liens marqués "mobile" + un onglet "Bureau"
 * qui n'existe QUE pour les membres du Bureau.
 */
export function BarreMobile({ sections, estBureau }: { sections: SectionNav[]; estBureau: boolean }) {
  const pathname = usePathname();
  const liens = sections[0]?.liens.filter((l) => l.mobile) ?? [];
  const onglets = [...liens];
  if (estBureau) onglets.splice(3, 0, { label: "Bureau", href: "/espace/bureau", icone: "valider" });

  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-bordure bg-fond-2/95 px-1 pt-1.5 backdrop-blur md:hidden"
    >
      {onglets.map((lien) => {
        const actif = estActif(pathname, lien.href);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            aria-current={actif ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
              actif ? "text-or" : "text-muet"
            }`}
          >
            {lien.label === "Bureau" ? <Lock size={22} strokeWidth={1.8} aria-hidden /> : <Icone nom={lien.icone} size={22} />}
            {lien.label}
          </Link>
        );
      })}
    </nav>
  );
}
