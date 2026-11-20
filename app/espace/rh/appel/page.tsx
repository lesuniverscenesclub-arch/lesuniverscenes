import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FeuilleAppel, type EvtAppel, type PersonneAppel, type Statut } from "@/components/rh/FeuilleAppel";

export const metadata = { title: "Feuille d'appel" };

const JOUR = 24 * 3600 * 1000;

export default async function PageAppel({ searchParams }: { searchParams: Promise<{ evt?: string }> }) {
  await requireRole("RH", "PRESIDENT");
  const { evt } = await searchParams;
  const supabase = await createClient();
  const maintenant = Date.now();

  // Événements des 30 derniers jours et des 7 prochains
  const { data: evts } = await supabase
    .from("evenements")
    .select("id, titre, type, date_debut, lieu")
    .gte("date_debut", new Date(maintenant - 30 * JOUR).toISOString())
    .lte("date_debut", new Date(maintenant + 7 * JOUR).toISOString())
    .order("date_debut", { ascending: false });
  const evenements = (evts ?? []) as EvtAppel[];

  // Par défaut : le dernier événement déjà commencé, sinon le prochain
  const choisi =
    evenements.find((e) => e.id === evt) ??
    evenements.find((e) => new Date(e.date_debut).getTime() <= maintenant) ??
    evenements[evenements.length - 1] ??
    null;

  const [{ data: users }, { data: pres }, { count: enAttente }] = await Promise.all([
    supabase
      .from("users")
      .select("id, prenom, nom, email, role, poste, avatar_url")
      .neq("role", "ADMIN")
      .order("prenom"),
    choisi
      ? supabase.from("presences").select("user_id, statut").eq("evenement_id", choisi.id)
      : Promise.resolve({ data: [] }),
    supabase.from("membres_preinscrits").select("email", { count: "exact", head: true }).is("inscrit_le", null),
  ]);

  const presences: Record<string, Statut> = {};
  for (const p of (pres ?? []) as { user_id: string; statut: Statut }[]) presences[p.user_id] = p.statut;

  return (
    <FeuilleAppel
      key={choisi?.id ?? "aucun"}
      evenements={evenements}
      evenement={choisi}
      personnes={(users ?? []) as PersonneAppel[]}
      presencesInitiales={presences}
      nbEnAttente={enAttente ?? 0}
    />
  );
}
