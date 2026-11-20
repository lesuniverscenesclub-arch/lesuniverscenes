import { SUPABASE_URL } from "./config";

/** URL publique d'une photo stockée dans le bucket "avatars" (ex. "bureau/aymen-gladi.jpg"). */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

export function initiales(prenom: string, nom: string): string {
  return `${prenom.trim()[0] ?? ""}${nom.trim()[0] ?? ""}`.toUpperCase() || "?";
}
