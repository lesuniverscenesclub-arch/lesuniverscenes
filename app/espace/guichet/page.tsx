import { requireProfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Guichet, type Demande } from "@/components/demandes/Demandes";

export const metadata = { title: "Guichet administratif" };

export default async function PageGuichet() {
  const profil = await requireProfil();
  const supabase = await createClient();

  const { data } = await supabase
    .from("demandes_administratives")
    .select("*")
    .eq("user_id", profil.id)
    .order("date_demande", { ascending: false });

  return <Guichet demandes={(data ?? []) as Demande[]} monId={profil.id} />;
}
