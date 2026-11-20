import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lien reçu par email (confirmation d'inscription, invitation, mot de passe oublié).
 * Supabase a déjà confirmé l'email avant d'arriver ici : si l'échange de session
 * échoue (lien ouvert dans un autre navigateur), on invite simplement à se connecter.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const suite = searchParams.get("suite") ?? "/espace";
  const destination = suite.startsWith("/") ? suite : "/espace";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
  }

  const message = destination.startsWith("/mot-de-passe") ? "lien-expire" : "compte-confirme";
  return NextResponse.redirect(`${origin}/connexion?message=${message}`);
}
