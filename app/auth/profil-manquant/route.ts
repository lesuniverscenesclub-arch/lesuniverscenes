import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Compte Supabase sans profil dans l'app : on le déconnecte et on explique. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/connexion?message=profil-manquant", request.url));
}
