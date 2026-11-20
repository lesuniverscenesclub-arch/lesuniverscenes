import { createClient } from "@/lib/supabase/server";
import type { Actualite } from "@/components/actualites/Actualites";
import type { DocumentClub } from "@/components/documents/Documents";

export async function lireActualites(): Promise<Actualite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("actualites")
    .select("*, auteur:users!actualites_publie_par_fkey(prenom, nom)")
    .order("date_publication", { ascending: false })
    .limit(100);
  return (data ?? []) as Actualite[];
}

/** Documents visibles par la personne connectée (le filtrage Bureau / Membres est fait par la base). */
export async function lireDocuments(): Promise<DocumentClub[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*, auteur:users!documents_uploade_par_fkey(prenom, nom)")
    .order("date_creation", { ascending: false })
    .limit(500);
  return (data ?? []) as DocumentClub[];
}
