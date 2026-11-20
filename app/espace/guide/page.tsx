import { requireProfil } from "@/lib/auth";

export const metadata = { title: "Guide de l'app" };

export default async function PageGuide() {
  await requireProfil();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Guide de l&apos;app</h1>
          <p className="text-doux">Tout savoir sur l&apos;application en 3 pages. Tu peux aussi l&apos;enregistrer en PDF.</p>
        </div>
        <a href="/guide.html" className="flex h-11 items-center gap-2 rounded-full border border-or px-5 text-sm font-semibold text-or">
          Ouvrir en plein écran
        </a>
      </div>
      <iframe
        src="/guide.html"
        title="Guide d'utilisation des Universcènes"
        className="h-[calc(100dvh-16rem)] min-h-[520px] w-full rounded-2xl border border-bordure bg-[#2a2622] md:h-[calc(100dvh-12rem)]"
      />
    </div>
  );
}
