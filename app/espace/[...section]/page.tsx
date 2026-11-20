import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { requireProfil } from "@/lib/auth";
import { aRole, lienPourChemin } from "@/lib/roles";

/**
 * Pages pas encore développées (prochaines étapes).
 * La protection par rôle s'applique déjà : un membre qui tape l'adresse
 * d'une page du Bureau obtient une 404.
 */
export default async function PageAVenir({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  const lien = lienPourChemin("/espace/" + section.join("/"));
  if (!lien) notFound();

  const profil = await requireProfil();
  if (lien.roles && !aRole(profil.role, ...lien.roles)) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">{lien.label}</h1>
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-bordure-2 bg-surface p-6">
        <Hammer className="text-or" aria-hidden />
        <p className="text-doux">Cette page arrive dans la prochaine mise à jour de l&apos;app.</p>
      </div>
    </div>
  );
}
