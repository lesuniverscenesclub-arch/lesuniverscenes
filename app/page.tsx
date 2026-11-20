import Link from "next/link";
import { Camera, Clapperboard, Drama, Megaphone, Package, CirclePlay } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl, initiales } from "@/lib/storage";
import { INSTAGRAM_URL, YOUTUBE_CHANNEL_ID, youtubeUploadsEmbed } from "@/lib/config";
import { dateCourte } from "@/lib/format";
import type { Actualite, MembreBureauPublic } from "@/lib/types";

const POLES = [
  { nom: "Théâtre", texte: "Répétitions, mises en scène et spectacles de fin de semestre.", Icone: Drama },
  { nom: "Cinéma", texte: "Écriture, tournage et montage de courts-métrages.", Icone: Clapperboard },
  { nom: "Logistique", texte: "Décors, costumes, salles et matériel.", Icone: Package },
  { nom: "Communication", texte: "Affiches, réseaux sociaux et relations presse.", Icone: Megaphone },
];

export default async function Accueil() {
  const supabase = await createClient();
  const [{ data: bureau }, { data: actualites }, { data: auth }] = await Promise.all([
    supabase.rpc("bureau_public"),
    supabase.from("actualites").select("*").order("date_publication", { ascending: false }).limit(3),
    supabase.auth.getUser(),
  ]);
  const connecte = !!auth.user;
  const equipe = (bureau ?? []) as MembreBureauPublic[];
  const news = (actualites ?? []) as Actualite[];
  const youtube = youtubeUploadsEmbed(YOUTUBE_CHANNEL_ID);

  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 border-b border-bordure bg-fond/90 backdrop-blur">
        <nav aria-label="Navigation principale" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo Les Universcènes" className="h-11 w-11 object-contain" />
            <span className="font-display text-lg font-bold md:text-xl">Les Universcènes</span>
          </Link>
          <div className="flex items-center gap-6 text-[15px]">
            <a href="#bureau" className="hidden text-doux hover:text-texte md:inline">Le Bureau</a>
            <a href="#actualites" className="hidden text-doux hover:text-texte md:inline">Actualités</a>
            <a href="#medias" className="hidden text-doux hover:text-texte md:inline">Médias</a>
            <Link
              href={connecte ? "/espace" : "/connexion"}
              className="rounded-full border border-or px-4 py-2 text-sm font-semibold text-or md:px-5"
            >
              {connecte ? "Mon espace" : "Connexion"}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pt-14 pb-14 md:pt-24 md:pb-20">
        <p className="text-xs font-semibold tracking-[0.22em] text-or uppercase md:text-sm">
          Club Théâtre &amp; Cinéma · Universiapolis
        </p>
        <h1 className="font-display text-5xl leading-[1.04] font-bold md:text-7xl">
          Sur scène,
          <br />
          <span className="font-medium text-or italic">derrière la caméra,</span>
          <br />
          ensemble.
        </h1>
        <p className="max-w-xl text-lg text-doux">
          Les Universcènes réunissent les étudiants passionnés de théâtre et de cinéma : on joue, on écrit, on tourne et on
          monte nos projets ensemble, toute l&apos;année.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/connexion" className="rounded-full bg-velours px-6 py-3.5 font-semibold text-white">
            Rejoindre le club
          </Link>
          <a href="#medias" className="rounded-full border border-bordure-2 px-6 py-3.5 font-medium">
            Voir nos créations
          </a>
        </div>
      </section>

      {/* Pôles */}
      <section className="border-y border-bordure bg-fond-2">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16">
          <h2 className="font-display text-4xl font-bold">Nos pôles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POLES.map(({ nom, texte, Icone }) => (
              <div key={nom} className="flex flex-col gap-3 rounded-2xl border border-bordure bg-surface p-6">
                <Icone className="text-or" size={28} strokeWidth={1.6} aria-hidden />
                <h3 className="text-xl font-semibold">{nom}</h3>
                <p className="text-[15px] text-muet">{texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bureau */}
      <section id="bureau" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-8 px-5 py-16">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-[0.22em] text-or uppercase">Meet our team</p>
          <h2 className="font-display text-4xl font-bold">Notre Bureau</h2>
        </div>
        <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
          {equipe.map((m) => {
            const photo = avatarUrl(m.avatar_url);
            return (
              <article key={`${m.prenom}-${m.nom}`} className="flex w-40 flex-none snap-start flex-col gap-3 md:w-auto">
                <div
                  className={`aspect-[3/4] overflow-hidden rounded-2xl border-4 ${photo ? "border-or-vif" : "border-bordure-2"}`}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={`Portrait de ${m.prenom} ${m.nom}`} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="hachures flex h-full w-full flex-col items-center justify-center gap-2">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2621] text-xl font-bold text-or md:h-20 md:w-20 md:text-2xl">
                        {initiales(m.prenom, m.nom)}
                      </span>
                      <span className="text-xs text-muet">Photo à venir</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-titre text-sm leading-tight font-extrabold text-or-vif uppercase md:text-lg">
                    {m.prenom} {m.nom}
                  </h3>
                  <p className="text-xs text-doux md:text-sm">{m.poste}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Actualités */}
      <section id="actualites" className="border-t border-bordure">
        <div className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-8 px-5 py-16">
          <h2 className="font-display text-4xl font-bold">Actualités</h2>
          {news.length === 0 ? (
            <p className="text-muet">Les premières actualités arrivent bientôt.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {news.map((a) => (
                <article key={a.id} className="flex flex-col overflow-hidden rounded-2xl border border-bordure bg-surface">
                  {a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt="" loading="lazy" className="h-48 w-full object-cover" />
                  ) : (
                    <div className="hachures h-48" />
                  )}
                  <div className="flex flex-col gap-2 p-5">
                    <span className="text-xs font-semibold tracking-[0.12em] text-velours-clair uppercase">
                      {dateCourte(a.date_publication)}
                    </span>
                    <h3 className="text-lg leading-snug font-semibold">{a.titre}</h3>
                    <p className="line-clamp-3 text-[15px] text-muet">{a.contenu}</p>
                    {a.lien_externe && (
                      <a href={a.lien_externe} target="_blank" rel="noreferrer" className="text-sm font-medium">
                        En savoir plus →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Médias */}
      <section id="medias" className="border-t border-bordure bg-fond-2">
        <div className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-8 px-5 py-16">
          <h2 className="font-display text-4xl font-bold">Médias</h2>
          {youtube && (
            <div className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <CirclePlay className="text-velours-clair" aria-hidden /> Nos dernières vidéos
              </h3>
              <div className="aspect-video overflow-hidden rounded-2xl border border-bordure">
                <iframe
                  src={youtube}
                  title="Vidéos YouTube des Universcènes"
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          )}
          {INSTAGRAM_URL && (
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-4 rounded-2xl border border-bordure bg-surface p-5"
            >
              <span className="flex items-center gap-3 text-lg font-semibold text-texte">
                <Camera className="text-or" aria-hidden /> Suivez-nous sur Instagram
              </span>
              <span>→</span>
            </a>
          )}
        </div>
      </section>

      {/* Appel à rejoindre */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-or bg-surface p-8 md:flex-row md:items-center md:p-12">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-3xl font-bold">Tu as reçu un code d&apos;invitation ?</h2>
            <p className="text-doux">
              Installe l&apos;app et crée ton compte membre : planning, tâches, chat et guichet administratif.
            </p>
          </div>
          <Link href="/connexion" className="flex-none rounded-full bg-or px-7 py-3.5 font-semibold text-encre">
            Créer mon compte
          </Link>
        </div>
      </section>

      <footer className="pb-safe border-t border-bordure">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-8 text-sm text-muet">
          <span>© Les Universcènes · Club Théâtre &amp; Cinéma Universiapolis</span>
          <a href="mailto:lesuniverscenesclub@gmail.com" className="text-muet hover:text-texte">
            lesuniverscenesclub@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
