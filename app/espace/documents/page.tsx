import { requireProfil } from "@/lib/auth";
import { aRole, estBureau } from "@/lib/roles";
import { lireDocuments } from "@/lib/contenus";
import { Documents } from "@/components/documents/Documents";

export const metadata = { title: "Documents" };

export default async function PageDocuments() {
  const profil = await requireProfil();
  return (
    <Documents
      documents={await lireDocuments()}
      peutGerer={aRole(profil.role, "PRESIDENT", "SECRETAIRE_GENERAL")}
      estBureau={estBureau(profil.role)}
      monId={profil.id}
    />
  );
}
