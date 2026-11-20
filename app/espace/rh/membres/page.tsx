import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListeMembres, type Inscrit, type Preinscrit } from "@/components/rh/ListeMembres";

export const metadata = { title: "Membres & candidats" };

export default async function PageMembres() {
  await requireRole("RH", "PRESIDENT", "VICE_PRESIDENT", "SECRETAIRE_GENERAL");
  const supabase = await createClient();

  const [{ data: pre }, { data: users }] = await Promise.all([
    supabase
      .from("membres_preinscrits")
      .select("email, email_2, nom_complet, telephone, etablissement, filiere, interets, competences, inscrit_le")
      .order("nom_complet"),
    supabase
      .from("users")
      .select("id, nom, prenom, email, role, poste, date_inscription")
      .order("ordre_bureau", { ascending: true, nullsFirst: false })
      .order("prenom"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Membres & candidats</h1>
        <p className="text-doux">
          Les candidats acceptés créent leur compte avec leur email, sans code. Relance ceux qui ne l&apos;ont pas encore
          fait.
        </p>
      </div>
      <ListeMembres preinscrits={(pre ?? []) as Preinscrit[]} inscrits={(users ?? []) as Inscrit[]} />
    </div>
  );
}
