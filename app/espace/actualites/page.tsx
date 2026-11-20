import { requireProfil } from "@/lib/auth";
import { aRole } from "@/lib/roles";
import { lireActualites } from "@/lib/contenus";
import { Actualites } from "@/components/actualites/Actualites";

export const metadata = { title: "Actualités" };

export default async function PageActualites() {
  const profil = await requireProfil();
  return (
    <Actualites
      actualites={await lireActualites()}
      peutPublier={aRole(profil.role, "PRESIDENT", "SECRETAIRE_GENERAL", "RESP_ARTISTIQUE_COM")}
      monId={profil.id}
    />
  );
}
