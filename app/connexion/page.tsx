import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FormulaireAuth } from "@/components/auth/FormulaireAuth";
import { redirect } from "next/navigation";
import { BarriereInstallation } from "@/components/pwa/BarriereInstallation";
import { getProfil } from "@/lib/auth";
import { estSurMobile } from "@/lib/appareil";

export const metadata = { title: "Connexion" };

const MESSAGES: Record<string, string> = {
  "compte-confirme": "Ton email est confirmé ! Connecte-toi pour accéder à ton espace.",
  "mot-de-passe-modifie": "Mot de passe modifié. Connecte-toi avec ton nouveau mot de passe.",
  "lien-expire": "Ce lien a expiré. Recommence l'opération.",
  "profil-manquant":
    "Ton compte existe mais n'a pas de profil dans l'app. Contacte l'administrateur du club (lesuniverscenesclub@gmail.com).",
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; message?: string }>;
}) {
  const { suite, message } = await searchParams;

  // Déjà connecté AVEC un profil : direction l'espace. Sans profil : on reste ici (pas de boucle).
  const profil = await getProfil();
  if (profil) redirect(suite && suite.startsWith("/espace") ? suite : "/espace");

  const mobile = await estSurMobile();

  return (
    <BarriereInstallation mobile={mobile}>
      <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 px-6 py-10">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-doux">
          <ChevronLeft size={18} aria-hidden /> Retour à l&apos;accueil
        </Link>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-16 w-16 object-contain" />
          <div>
            <h1 className="font-display text-3xl leading-tight font-bold">
              Les <span className="font-medium text-or italic">Universcènes</span>
            </h1>
            <p className="text-sm text-muet">Espace membres du club</p>
          </div>
        </div>
        <FormulaireAuth suite={suite} message={message ? MESSAGES[message] : undefined} />
      </main>
    </BarriereInstallation>
  );
}
