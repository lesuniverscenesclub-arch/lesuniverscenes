import { requireProfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aRole, estBureau } from "@/lib/roles";
import { Messagerie, type Auteur } from "@/components/messagerie/Messagerie";

export const metadata = { title: "Messagerie" };

export default async function PageMessagerie() {
  const profil = await requireProfil();
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("id, prenom, nom, avatar_url, poste");

  return (
    <Messagerie
      monId={profil.id}
      estBureau={estBureau(profil.role)}
      peutModerer={aRole(profil.role, "PRESIDENT")}
      auteurs={(data ?? []) as Auteur[]}
    />
  );
}
