import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GestionTaches, type Personne, type Tache } from "@/components/taches/Taches";

export const metadata = { title: "Assigner des tâches" };

export default async function PageAssignerTaches() {
  const profil = await requireRole("PRESIDENT");
  const supabase = await createClient();

  const [{ data: taches }, { data: personnes }] = await Promise.all([
    supabase
      .from("taches")
      .select("*, assigne:users!taches_assigne_a_fkey(prenom, nom, avatar_url)")
      .order("cree_le", { ascending: false })
      .limit(500),
    supabase
      .from("users")
      .select("id, prenom, nom, role, poste, avatar_url")
      .neq("role", "ADMIN")
      .order("ordre_bureau", { ascending: true, nullsFirst: false })
      .order("prenom"),
  ]);

  return <GestionTaches taches={(taches ?? []) as Tache[]} personnes={(personnes ?? []) as Personne[]} monId={profil.id} />;
}
