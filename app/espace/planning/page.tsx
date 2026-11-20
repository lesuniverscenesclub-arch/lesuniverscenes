import { requireProfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aRole } from "@/lib/roles";
import { VuePlanning } from "@/components/planning/VuePlanning";
import type { Evenement } from "@/lib/types";

export const metadata = { title: "Planning" };

const JOURS_HISTORIQUE = 60;

export default async function PagePlanning() {
  const profil = await requireProfil();
  const supabase = await createClient();
  const depuis = new Date(Date.now() - JOURS_HISTORIQUE * 24 * 3600 * 1000).toISOString();

  const [{ data: evts }, { data: pres }] = await Promise.all([
    supabase
      .from("evenements")
      .select("id, titre, description, type, date_debut, date_fin, lieu")
      .gte("date_debut", depuis)
      .order("date_debut"),
    supabase.from("presences").select("evenement_id, statut").eq("user_id", profil.id),
  ]);

  const presences: Record<string, string> = {};
  for (const p of (pres ?? []) as { evenement_id: string; statut: string }[]) presences[p.evenement_id] = p.statut;

  return (
    <VuePlanning
      evenements={(evts ?? []) as Evenement[]}
      presences={presences}
      peutGerer={aRole(profil.role, "PRESIDENT", "VICE_PRESIDENT")}
    />
  );
}
