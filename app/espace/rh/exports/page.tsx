import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ExportsPresences,
  type EvtExport,
  type PersonneExport,
  type PresenceExport,
} from "@/components/rh/ExportsPresences";

export const metadata = { title: "Exports présences" };

export default async function PageExports() {
  await requireRole("RH", "PRESIDENT");
  const supabase = await createClient();
  const depuis = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();

  const [{ data: evts }, { data: users }] = await Promise.all([
    supabase
      .from("evenements")
      .select("id, titre, type, date_debut")
      .gte("date_debut", depuis)
      .lte("date_debut", new Date().toISOString())
      .order("date_debut", { ascending: false }),
    supabase.from("users").select("id, prenom, nom, email, poste, role").neq("role", "ADMIN").order("prenom"),
  ]);

  // Les présences peuvent dépasser la limite de 1000 lignes par requête : on lit par pages.
  const presences: PresenceExport[] = [];
  if (evts?.length) {
    for (let page = 0; page < 50; page++) {
      const { data } = await supabase
        .from("presences")
        .select("evenement_id, user_id, statut, remarque, evenements!inner(date_debut)")
        .gte("evenements.date_debut", depuis)
        .order("id")
        .range(page * 1000, page * 1000 + 999);
      presences.push(
        ...((data ?? []) as unknown as PresenceExport[]).map(({ evenement_id, user_id, statut, remarque }) => ({ evenement_id, user_id, statut, remarque }))
      );
      if (!data || data.length < 1000) break;
    }
  }

  return (
    <ExportsPresences
      evenements={(evts ?? []) as EvtExport[]}
      personnes={(users ?? []) as PersonneExport[]}
      presences={presences}
    />
  );
}
