import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aRole } from "@/lib/roles";
import type { Profil, Role } from "@/lib/types";

type Resultat = { connecte: false } | { connecte: true; profil: Profil | null };

/** Utilisateur connecté + son profil (mis en cache pour la durée d'une requête). */
const lireSession = cache(async (): Promise<Resultat> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connecte: false };

  const { data } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  return { connecte: true, profil: (data as Profil | null) ?? null };
});

export async function getProfil(): Promise<Profil | null> {
  const r = await lireSession();
  return r.connecte ? r.profil : null;
}

/** À utiliser en haut de chaque page de /espace. */
export async function requireProfil(): Promise<Profil> {
  const r = await lireSession();
  if (!r.connecte) redirect("/connexion");
  // Connecté mais sans profil (compte créé avant le schéma, ou refusé) :
  // on déconnecte proprement au lieu de renvoyer vers /connexion (sinon boucle).
  if (!r.profil) redirect("/auth/profil-manquant");
  return r.profil;
}

/**
 * Protège une page réservée. Un utilisateur sans le rôle reçoit une page 404 :
 * il ne sait même pas que la page existe.
 */
export async function requireRole(...roles: Role[]): Promise<Profil> {
  const profil = await requireProfil();
  if (!aRole(profil.role, ...roles)) notFound();
  return profil;
}
