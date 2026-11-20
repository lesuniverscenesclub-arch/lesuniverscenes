import { createClient } from "@/lib/supabase/server";
import type { Demande } from "@/components/demandes/Demandes";

/** Toutes les demandes avec le nom du demandeur et de la personne qui les a traitées. */
export async function toutesLesDemandes(): Promise<Demande[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("demandes_administratives")
    .select(
      "*, demandeur:users!demandes_administratives_user_id_fkey(prenom, nom, email), traiteur:users!demandes_administratives_traite_par_fkey(prenom, nom)"
    )
    .order("date_demande", { ascending: false })
    .limit(300);
  return (data ?? []) as Demande[];
}
