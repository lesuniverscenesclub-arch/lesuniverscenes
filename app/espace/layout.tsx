import Link from "next/link";
import { requireProfil } from "@/lib/auth";
import { LIBELLES_ROLES, estBureau, navigationPour } from "@/lib/roles";
import { BarreLaterale, BarreMobile } from "@/components/nav/Navigation";
import { Avatar } from "@/components/nav/Avatar";
import { BarriereInstallation } from "@/components/pwa/BarriereInstallation";
import { estSurMobile } from "@/lib/appareil";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const profil = await requireProfil();
  const sections = navigationPour(profil.role);
  const libelle = profil.poste ?? LIBELLES_ROLES[profil.role];
  const mobile = await estSurMobile();

  return (
    <BarriereInstallation mobile={mobile}>
      <div className="flex min-h-dvh">
        <BarreLaterale
          sections={sections}
          utilisateur={{ prenom: profil.prenom, nom: profil.nom, avatar_url: profil.avatar_url, libelle }}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* En-tête mobile */}
          <header className="pt-safe sticky top-0 z-30 flex items-center justify-between border-b border-bordure bg-fond/95 px-4 py-2.5 backdrop-blur md:hidden">
            <Link href="/espace" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
              <span className="font-display text-lg font-bold">Universcènes</span>
            </Link>
            <Link href="/espace/profil" aria-label="Mon profil">
              <Avatar prenom={profil.prenom} nom={profil.nom} chemin={profil.avatar_url} taille={36} />
            </Link>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
        </div>

        <BarreMobile sections={sections} estBureau={estBureau(profil.role)} />
      </div>
    </BarriereInstallation>
  );
}
