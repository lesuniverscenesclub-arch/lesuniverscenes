import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

/**
 * Rafraîchit la session Supabase à chaque requête et protège /espace.
 * Le proxy ne redirige que dans UN sens (non connecté → /connexion) :
 * il ne renvoie jamais de /connexion vers /espace, ce qui rend toute boucle impossible.
 * C'est la page /connexion qui redirige vers /espace si le profil existe vraiment.
 * Les RÔLES sont vérifiés dans les pages (requireRole) et dans la base (RLS).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Ne rien mettre entre createServerClient et getUser (recommandation Supabase).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && path.startsWith("/espace")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    url.searchParams.set("suite", path);
    return NextResponse.redirect(url);
  }

  return response;
}
