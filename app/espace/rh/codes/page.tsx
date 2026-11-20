import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GestionCodes } from "@/components/rh/GestionCodes";
import type { CodeInvitation } from "@/lib/types";

export const metadata = { title: "Codes d'invitation" };

export default async function PageCodes() {
  await requireRole("RH", "PRESIDENT");
  const supabase = await createClient();

  const { data } = await supabase
    .from("club_codes")
    .select("id, code, est_utilise, utilise_par_user_id, utilise_le, cree_le, expire_le")
    .order("cree_le", { ascending: false })
    .limit(200);

  // Noms des membres ayant utilisé un code
  const codes = (data ?? []) as CodeInvitation[];
  const ids = codes.map((c) => c.utilise_par_user_id).filter((x): x is string => !!x);
  const { data: membres } = ids.length
    ? await supabase.from("users").select("id, prenom, nom").in("id", ids)
    : { data: [] as { id: string; prenom: string; nom: string }[] };
  const noms = Object.fromEntries((membres ?? []).map((m) => [m.id, `${m.prenom} ${m.nom}`.trim()]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Codes d&apos;invitation</h1>
        <p className="text-doux">
          Chaque code permet à <strong>une</strong> personne de créer son compte membre. Partage-le en privé.
        </p>
      </div>
      <GestionCodes codes={codes} noms={noms} />
    </div>
  );
}
