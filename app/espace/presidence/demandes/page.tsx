import { requireRole } from "@/lib/auth";
import { toutesLesDemandes } from "@/lib/demandes";
import { TraitementDemandes } from "@/components/demandes/Demandes";

export const metadata = { title: "Valider les demandes" };

export default async function PageValiderDemandes() {
  await requireRole("PRESIDENT");
  return (
    <TraitementDemandes
      demandes={await toutesLesDemandes()}
      titre="Valider les demandes"
      description="Joins le document signé (PDF) puis valide : le membre le télécharge aussitôt depuis son guichet. Ou refuse en expliquant pourquoi."
    />
  );
}
