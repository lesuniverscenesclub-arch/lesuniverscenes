import { LogOut } from "lucide-react";
import { requireProfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LIBELLES_ROLES } from "@/lib/roles";
import { FormulaireProfil } from "@/components/profil/FormulaireProfil";

export const metadata = { title: "Mon profil" };

export default async function PageProfil() {
  const profil = await requireProfil();
  const supabase = await createClient();

  const [presence, demandes] = await Promise.all([
    supabase.from("v_taux_presence").select("taux_presence, total_evenements").eq("user_id", profil.id).maybeSingle(),
    supabase.from("demandes_administratives").select("id", { count: "exact", head: true }).eq("user_id", profil.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">Mon profil</h1>

      <FormulaireProfil
        profil={profil}
        libellePoste={profil.poste ?? LIBELLES_ROLES[profil.role]}
        stats={{
          presence: presence.data?.taux_presence ?? null,
          evenements: presence.data?.total_evenements ?? 0,
          demandes: demandes.count ?? 0,
        }}
      />

      <form action="/auth/deconnexion" method="post" className="md:hidden">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-bordure-2 text-doux">
          <LogOut size={18} aria-hidden /> Se déconnecter
        </button>
      </form>
    </div>
  );
}
