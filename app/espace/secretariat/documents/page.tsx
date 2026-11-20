import { requireRole } from "@/lib/auth";
import { lireDocuments } from "@/lib/contenus";
import { Documents } from "@/components/documents/Documents";

export const metadata = { title: "Archives & documents" };

export default async function PageArchives() {
  const profil = await requireRole("PRESIDENT", "SECRETAIRE_GENERAL");
  return <Documents documents={await lireDocuments()} peutGerer estBureau monId={profil.id} />;
}
