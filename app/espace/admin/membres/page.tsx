import { notFound } from "next/navigation";
import { requireProfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GestionRoles } from "@/components/admin/GestionRoles";
import type { Profil } from "@/lib/types";

export const metadata = { title: "Membres & rôles" };

export default async function PageAdminMembres() {
  const profil = await requireProfil();
  if (profil.role !== "ADMIN") notFound(); // réservé au compte administrateur
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("ordre_bureau", { ascending: true, nullsFirst: false })
    .order("prenom");

  return <GestionRoles utilisateurs={(data ?? []) as Profil[]} monId={profil.id} />;
}
