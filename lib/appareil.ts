import { headers } from "next/headers";

/** Détection côté serveur : téléphone ou tablette ? (sur ordinateur, pas de barrière d'installation) */
export async function estSurMobile(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}
