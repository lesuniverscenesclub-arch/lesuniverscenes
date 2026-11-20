import Link from "next/link";
import { CircleAlert, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Analytics" };

const JOUR = 24 * 3600 * 1000;
const FUSEAU = "Africa/Casablanca";
const SEUIL_RELANCE = 60; // % de présence en dessous duquel on relance
const MIN_EVENEMENTS = 3; // pas de jugement avant 3 appels

const TYPES: Record<string, string> = {
  REPETITION: "Répétitions",
  TOURNAGE: "Tournages",
  SPECTACLE: "Spectacles",
  REUNION: "Réunions",
};

interface Stats {
  taux_presence_moyen: number | null;
  nb_membres: number;
  nb_taches_ouvertes: number;
  nb_taches_en_retard: number;
  nb_demandes_attente: number;
  nb_evenements_a_venir: number;
}
interface Evt {
  id: string;
  titre: string;
  type: string;
  date_debut: string;
}
interface Pres {
  evenement_id: string;
  user_id: string;
  statut: string;
}
interface Taux {
  user_id: string;
  total_evenements: number;
  taux_presence: number | null;
}
interface Personne {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  poste: string | null;
}
interface Pre {
  etablissement: string | null;
  interets: string | null;
  inscrit_le: string | null;
}

/** (présents + retards) / (notés − justifiés), comme la vue SQL v_taux_presence */
function taux(liste: Pres[]): { pct: number | null; venus: number; attendus: number } {
  const venus = liste.filter((p) => p.statut === "PRESENT" || p.statut === "RETARD").length;
  const attendus = liste.filter((p) => p.statut !== "JUSTIFIE").length;
  return { pct: attendus ? Math.round((100 * venus) / attendus) : null, venus, attendus };
}

export default async function PageAnalytics() {
  await requireRole("PRESIDENT", "VICE_PRESIDENT");
  const supabase = await createClient();
  const maintenant = Date.now();

  const [stats, evts, users, tauxMembres, pre] = await Promise.all([
    supabase.rpc("stats_president").single(),
    supabase
      .from("evenements")
      .select("id, titre, type, date_debut")
      .gte("date_debut", new Date(maintenant - 90 * JOUR).toISOString())
      .lte("date_debut", new Date(maintenant).toISOString())
      .order("date_debut", { ascending: false }),
    supabase.from("users").select("id, prenom, nom, role, poste").neq("role", "ADMIN"),
    supabase.from("v_taux_presence").select("user_id, total_evenements, taux_presence"),
    supabase.from("membres_preinscrits").select("etablissement, interets, inscrit_le"),
  ]);

  const s = stats.data as Stats | null;
  const evenements = (evts.data ?? []) as Evt[];
  const personnes = new Map(((users.data ?? []) as Personne[]).map((p) => [p.id, p]));
  const candidats = (pre.data ?? []) as Pre[];

  const ids = evenements.map((e) => e.id);
  const { data: presData } = ids.length
    ? await supabase.from("presences").select("evenement_id, user_id, statut").in("evenement_id", ids)
    : { data: [] };
  const presences = (presData ?? []) as Pres[];

  /* --- Présence par événement (les 8 derniers ayant un appel) --- */
  const parEvenement = evenements
    .map((e) => ({ e, ...taux(presences.filter((p) => p.evenement_id === e.id)) }))
    .filter((x) => x.attendus > 0)
    .slice(0, 8);

  /* --- Présence par type --- */
  const parType = Object.entries(TYPES)
    .map(([cle, label]) => {
      const idsType = new Set(evenements.filter((e) => e.type === cle).map((e) => e.id));
      return { label, ...taux(presences.filter((p) => idsType.has(p.evenement_id))) };
    })
    .filter((x) => x.attendus > 0);

  /* --- Membres : à relancer / plus assidus --- */
  const classement = ((tauxMembres.data ?? []) as Taux[])
    .filter((t) => t.taux_presence !== null && t.total_evenements >= MIN_EVENEMENTS && personnes.has(t.user_id))
    .map((t) => ({ ...t, p: personnes.get(t.user_id)! }))
    .sort((a, b) => (a.taux_presence ?? 0) - (b.taux_presence ?? 0));
  const aRelancer = classement.filter((c) => (c.taux_presence ?? 0) < SEUIL_RELANCE);
  const assidus = [...classement].reverse().filter((c) => (c.taux_presence ?? 0) >= 90).slice(0, 5);

  /* --- Recrutement --- */
  const inscrits = candidats.filter((c) => c.inscrit_le).length;
  const compter = (valeurs: (string | null)[]) => {
    const m = new Map<string, number>();
    for (const v of valeurs) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const parEtablissement = compter(candidats.map((c) => c.etablissement?.trim() || null));
  const parInteret = compter(
    candidats.flatMap((c) =>
      (c.interets ?? "")
        .split(",")
        .map((i) => i.trim().replace(/\s*\(.*\)$/, ""))
        .filter(Boolean)
    )
  ).slice(0, 6);

  const mois = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: FUSEAU }).format(new Date());
  const debutMois = new Date(new Date().toLocaleString("en-US", { timeZone: FUSEAU }));
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const evenementsCeMois = evenements.filter((e) => new Date(e.date_debut) >= debutMois).length;
  const fmtJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: FUSEAU });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Analytics</h1>
        <p className="text-doux">Vue d&apos;ensemble du club : présence, activité et recrutement.</p>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tuile
          label="Taux de présence moyen"
          valeur={s?.taux_presence_moyen != null ? `${s.taux_presence_moyen} %` : "—"}
          detail="tous les appels"
          or
        />
        <Tuile label="Comptes actifs" valeur={String(personnes.size)} detail="Bureau + membres" />
        <Tuile label="Candidats en attente" valeur={String(candidats.length - inscrits)} detail={`sur ${candidats.length} acceptés`} />
        <Tuile label={`Événements en ${mois}`} valeur={String(evenementsCeMois)} detail={`${s?.nb_evenements_a_venir ?? 0} à venir`} />
        <Tuile
          label="Tâches en retard"
          valeur={String(s?.nb_taches_en_retard ?? 0)}
          detail={`sur ${s?.nb_taches_ouvertes ?? 0} ouvertes`}
          alerte={(s?.nb_taches_en_retard ?? 0) > 0}
        />
        <Tuile label="Demandes en attente" valeur={String(s?.nb_demandes_attente ?? 0)} detail="guichet administratif" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Présence par événement */}
        <Carte titre="Présence aux derniers événements" sousTitre="Présents et retards, absences justifiées exclues">
          {parEvenement.length === 0 ? (
            <Vide>
              Aucun appel enregistré pour l&apos;instant. Les résultats apparaîtront après la première{" "}
              <Link href="/espace/rh/appel" className="text-or underline">
                feuille d&apos;appel
              </Link>
              .
            </Vide>
          ) : (
            <ListeBarres
              lignes={parEvenement.map((x) => ({
                cle: x.e.id,
                label: x.e.titre,
                sous: fmtJour.format(new Date(x.e.date_debut)),
                pct: x.pct ?? 0,
                valeur: `${x.pct} %`,
                detail: `${x.venus}/${x.attendus}`,
              }))}
            />
          )}
        </Carte>

        {/* Présence par type */}
        <Carte titre="Présence par type d'activité" sousTitre="90 derniers jours">
          {parType.length === 0 ? (
            <Vide>Pas encore de données.</Vide>
          ) : (
            <ListeBarres
              lignes={parType.map((x) => ({
                cle: x.label,
                label: x.label,
                pct: x.pct ?? 0,
                valeur: `${x.pct} %`,
                detail: `${x.venus}/${x.attendus}`,
              }))}
            />
          )}
        </Carte>

        {/* À relancer */}
        <Carte titre="Membres à relancer" sousTitre={`Présence sous ${SEUIL_RELANCE} % (au moins ${MIN_EVENEMENTS} appels)`}>
          {aRelancer.length === 0 ? (
            <Vide>
              {classement.length === 0
                ? `Il faut au moins ${MIN_EVENEMENTS} appels par membre pour juger de l'assiduité.`
                : "Personne sous le seuil. Bravo à la troupe !"}
            </Vide>
          ) : (
            <ul className="flex flex-col divide-y divide-bordure">
              {aRelancer.map((c) => (
                <li key={c.user_id} className="flex items-center gap-3 py-2.5">
                  <CircleAlert size={18} className="flex-none text-alerte" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {c.p.prenom} {c.p.nom}
                    {c.p.role !== "MEMBRE" && <span className="ml-2 text-xs text-or-clair">{c.p.poste ?? "Bureau"}</span>}
                  </span>
                  <span className="text-sm text-muet">{c.total_evenements} appels</span>
                  <span className="w-14 text-right font-semibold tabular-nums text-alerte">{c.taux_presence} %</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        {/* Plus assidus */}
        <Carte titre="Les plus assidus" sousTitre="90 % de présence ou plus">
          {assidus.length === 0 ? (
            <Vide>Pas encore assez d&apos;appels.</Vide>
          ) : (
            <ul className="flex flex-col divide-y divide-bordure">
              {assidus.map((c) => (
                <li key={c.user_id} className="flex items-center gap-3 py-2.5">
                  <Trophy size={18} className="flex-none text-or" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {c.p.prenom} {c.p.nom}
                  </span>
                  <span className="text-sm text-muet">{c.total_evenements} appels</span>
                  <span className="w-14 text-right font-semibold tabular-nums text-succes">{c.taux_presence} %</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>

      {/* Recrutement */}
      <section className="flex flex-col gap-4 rounded-2xl border border-bordure bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Recrutement</h2>
            <p className="text-sm text-muet">Candidats acceptés qui ont créé leur compte</p>
          </div>
          <Link href="/espace/rh/membres" className="text-sm">
            Voir la liste →
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="h-3 flex-1 overflow-hidden rounded-full bg-[#262320]"
            role="img"
            aria-label={`${inscrits} sur ${candidats.length} candidats inscrits`}
          >
            <div
              className="h-full rounded-full bg-or"
              style={{ width: `${candidats.length ? (100 * inscrits) / candidats.length : 0}%` }}
            />
          </div>
          <span className="font-semibold tabular-nums">
            {inscrits}/{candidats.length}
          </span>
        </div>

        <div className="grid gap-6 pt-2 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-doux">Par établissement</h3>
            <ListeBarres
              lignes={parEtablissement.map(([nom, n]) => ({
                cle: nom,
                label: nom,
                pct: (100 * n) / (parEtablissement[0]?.[1] || 1),
                valeur: String(n),
              }))}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-doux">Centres d&apos;intérêt</h3>
            <ListeBarres
              lignes={parInteret.map(([nom, n]) => ({
                cle: nom,
                label: nom,
                pct: (100 * n) / (parInteret[0]?.[1] || 1),
                valeur: String(n),
              }))}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Tuile({
  label,
  valeur,
  detail,
  or,
  alerte,
}: {
  label: string;
  valeur: string;
  detail: string;
  or?: boolean;
  alerte?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-bordure bg-surface p-4">
      <span className="text-xs text-muet">{label}</span>
      <span className={`text-2xl font-semibold tabular-nums md:text-3xl ${or ? "text-or" : alerte ? "text-alerte" : ""}`}>
        {valeur}
      </span>
      <span className="text-xs text-muet">{detail}</span>
    </div>
  );
}

function Carte({ titre, sousTitre, children }: { titre: string; sousTitre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-bordure bg-surface p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold">{titre}</h2>
        <p className="text-sm text-muet">{sousTitre}</p>
      </div>
      {children}
    </section>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-bordure-2 p-5 text-center text-sm text-muet">{children}</p>;
}

/** Barres horizontales simples : une seule série, valeur écrite à côté (jamais la couleur seule). */
function ListeBarres({
  lignes,
}: {
  lignes: { cle: string; label: string; sous?: string; pct: number; valeur: string; detail?: string }[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {lignes.map((l) => (
        <li key={l.cle} className="flex flex-col gap-1.5" title={`${l.label} : ${l.valeur}${l.detail ? ` (${l.detail})` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {l.label}
              {l.sous && <span className="ml-2 text-xs text-muet">{l.sous}</span>}
            </span>
            <span className="flex-none tabular-nums">
              <span className="font-semibold">{l.valeur}</span>
              {l.detail && <span className="ml-1.5 text-xs text-muet">{l.detail}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#262320]">
            <div className="h-full rounded-full bg-or" style={{ width: `${Math.max(2, Math.min(100, l.pct))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
