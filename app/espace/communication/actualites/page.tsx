import { requireRole } from "@/lib/auth";
import { lireActualites } from "@/lib/contenus";
import { Actualites } from "@/components/actualites/Actualites";

export const metadata = { title: "Publier une actualité" };

export default async function PagePublierActualite() {
  const profil = await requireRole("PRESIDENT", "SECRETAIRE_GENERAL", "RESP_ARTISTIQUE_COM");
  return <Actualites actualites={await lireActualites()} peutPublier monId={profil.id} />;
}
