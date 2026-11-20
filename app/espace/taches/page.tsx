import { requireProfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MesTaches, type Tache } from "@/components/taches/Taches";

export const metadata = { title: "Mes tâches" };

export default async function PageMesTaches() {
  const profil = await requireProfil();
  const supabase = await createClient();

  const { data } = await supabase
    .from("taches")
    .select("*, auteur:users!taches_assigne_par_fkey(prenom, nom)")
    .eq("assigne_a", profil.id)
    .order("cree_le", { ascending: false });

  return <MesTaches taches={(data ?? []) as Tache[]} />;
}
