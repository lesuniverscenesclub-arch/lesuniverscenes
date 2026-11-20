import { requireRole } from "@/lib/auth";
import { toutesLesDemandes } from "@/lib/demandes";
import { TraitementDemandes } from "@/components/demandes/Demandes";

export const metadata = { title: "Demandes à traiter" };

export default async function PageDemandesSecretariat() {
  await requireRole("SECRETAIRE_GENERAL");
  return (
    <TraitementDemandes
      demandes={await toutesLesDemandes()}
      titre="Demandes à traiter"
      description="Prépare le document, joins le PDF signé et valide : le membre le reçoit dans son guichet. Le Président voit les mêmes demandes."
    />
  );
}
