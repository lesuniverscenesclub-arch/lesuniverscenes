import Link from "next/link";
import { Lock } from "lucide-react";
import { requireProfil } from "@/lib/auth";
import { estBureau, navigationPour } from "@/lib/roles";
import { notFound } from "next/navigation";
import { Icone } from "@/components/nav/Icone";

export const metadata = { title: "Espace Bureau" };

/** Onglet « Bureau » de la barre mobile : rassemble les outils de SON rôle. */
export default async function PageBureau() {
  const profil = await requireProfil();
  if (!estBureau(profil.role)) notFound();

  const sections = navigationPour(profil.role).slice(1); // sans l'espace commun

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
        <Lock size={22} className="text-or" aria-hidden /> Espace Bureau
      </h1>

      {sections.length === 0 && (
        <p className="rounded-2xl border border-bordure bg-surface p-5 text-doux">
          Pas encore d&apos;outil spécifique pour ton poste. Tu as accès au canal privé <strong>Bureau</strong> dans la
          messagerie.
        </p>
      )}

      {sections.map((s) => (
        <section key={s.titre} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-or uppercase">{s.titre}</h2>
          <div className="grid grid-cols-2 gap-3">
            {s.liens.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex min-h-24 flex-col justify-between gap-3 rounded-2xl border border-bordure-2 bg-surface-2 p-4 font-medium"
              >
                <span className="text-or">
                  <Icone nom={l.icone} size={22} />
                </span>
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
