"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Clock, LoaderCircle, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Evenement } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Constantes et utilitaires                                            */
/* ------------------------------------------------------------------ */

const FUSEAU = "Africa/Casablanca";
const DUREE_PAR_DEFAUT = 3 * 3600 * 1000; // un événement sans heure de fin dure 3 h

type TypeEvt = Evenement["type"];

const TYPES: Record<TypeEvt, { label: string; classe: string }> = {
  REPETITION: { label: "Répétition", classe: "bg-[#2a2213] text-or-clair" },
  TOURNAGE: { label: "Tournage", classe: "bg-[#16202b] text-[#8cb8e8]" },
  SPECTACLE: { label: "Spectacle", classe: "bg-[#3a1714] text-alerte" },
  REUNION: { label: "Réunion", classe: "bg-[#1e2a1f] text-succes" },
};

const PRESENCES: Record<string, { label: string; classe: string }> = {
  PRESENT: { label: "Présent", classe: "text-succes" },
  RETARD: { label: "En retard", classe: "text-or-clair" },
  ABSENT: { label: "Absent", classe: "text-alerte" },
  JUSTIFIE: { label: "Absence justifiée", classe: "text-[#8cb8e8]" },
};

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, ...opts });
const fmtJour = fmt({ day: "numeric" });
const fmtMoisCourt = fmt({ month: "short" });
const fmtJourSemaine = fmt({ weekday: "short" });
const fmtHeure = fmt({ hour: "2-digit", minute: "2-digit" });
const fmtMoisAnnee = fmt({ month: "long", year: "numeric" });

function finDe(e: Evenement): number {
  return e.date_fin ? new Date(e.date_fin).getTime() : new Date(e.date_debut).getTime() + DUREE_PAR_DEFAUT;
}

/** ISO -> { date: "2026-11-20", heure: "18:00" } à l'heure du Maroc (pour pré-remplir le formulaire) */
function versChamps(iso: string | null): { date: string; heure: string } {
  if (!iso) return { date: "", heure: "" };
  const s = new Date(iso).toLocaleString("sv-SE", { timeZone: FUSEAU }); // "2026-11-20 18:00:00"
  return { date: s.slice(0, 10), heure: s.slice(11, 16) };
}

/** Fichier .ics pour ajouter l'événement à l'agenda du téléphone */
function telechargerIcs(e: Evenement) {
  const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const echapper = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => "\\" + c);
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Les Universcenes//Planning//FR",
    "BEGIN:VEVENT",
    `UID:${e.id}@universcenes`,
    `DTSTAMP:${utc(Date.now())}`,
    `DTSTART:${utc(new Date(e.date_debut).getTime())}`,
    `DTEND:${utc(finDe(e))}`,
    `SUMMARY:${echapper(`${TYPES[e.type].label} · ${e.titre}`)}`,
    e.lieu ? `LOCATION:${echapper(e.lieu)}` : "",
    e.description ? `DESCRIPTION:${echapper(e.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const url = URL.createObjectURL(new Blob([lignes.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.titre.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "evenement"}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Vue principale                                                       */
/* ------------------------------------------------------------------ */

export function VuePlanning({
  evenements,
  presences,
  peutGerer,
}: {
  evenements: Evenement[];
  presences: Record<string, string>;
  peutGerer: boolean;
}) {
  const [onglet, setOnglet] = useState<"avenir" | "passes">("avenir");
  const [filtre, setFiltre] = useState<TypeEvt | null>(null);
  const [edition, setEdition] = useState<Evenement | "nouveau" | null>(null);

  const { avenir, passes } = useMemo(() => {
    const maintenant = Date.now();
    const visibles = evenements.filter((e) => !filtre || e.type === filtre);
    return {
      avenir: visibles.filter((e) => finDe(e) >= maintenant),
      passes: visibles.filter((e) => finDe(e) < maintenant).reverse(),
    };
  }, [evenements, filtre]);

  const liste = onglet === "avenir" ? avenir : passes;

  // Regroupement par mois
  const groupes = useMemo(() => {
    const g: { mois: string; evts: Evenement[] }[] = [];
    for (const e of liste) {
      const mois = fmtMoisAnnee.format(new Date(e.date_debut));
      const dernier = g[g.length - 1];
      if (dernier && dernier.mois === mois) dernier.evts.push(e);
      else g.push({ mois, evts: [e] });
    }
    return g;
  }, [liste]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Planning</h1>
        {peutGerer && (
          <button
            onClick={() => setEdition("nouveau")}
            className="flex h-11 items-center gap-2 rounded-full bg-velours px-5 font-semibold text-white"
          >
            <Plus size={18} aria-hidden /> Nouvel événement
          </button>
        )}
      </div>

      {/* Onglets */}
      <div role="tablist" aria-label="Période" className="flex w-full max-w-sm rounded-full border border-bordure bg-surface p-1">
        {(
          [
            ["avenir", `À venir (${avenir.length})`],
            ["passes", "Passés"],
          ] as const
        ).map(([o, label]) => (
          <button
            key={o}
            role="tab"
            aria-selected={onglet === o}
            onClick={() => setOnglet(o)}
            className={`h-10 flex-1 rounded-full text-sm font-semibold transition ${onglet === o ? "bg-or text-encre" : "text-doux"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtres par type */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filtrer par type">
        <Puce actif={filtre === null} onClick={() => setFiltre(null)}>
          Tous
        </Puce>
        {(Object.keys(TYPES) as TypeEvt[]).map((t) => (
          <Puce key={t} actif={filtre === t} onClick={() => setFiltre(filtre === t ? null : t)}>
            {TYPES[t].label}
          </Puce>
        ))}
      </div>

      {/* Liste */}
      {groupes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bordure-2 bg-surface p-8 text-center text-muet">
          {onglet === "avenir"
            ? peutGerer
              ? "Aucun événement à venir. Crée le premier avec « Nouvel événement »."
              : "Aucun événement programmé pour l'instant."
            : "Aucun événement passé sur les deux derniers mois."}
        </div>
      ) : (
        groupes.map(({ mois, evts }) => (
          <section key={mois} className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold tracking-[0.14em] text-muet uppercase">{mois}</h2>
            {evts.map((e) => (
              <CarteEvenement
                key={e.id}
                e={e}
                passe={onglet === "passes"}
                presence={presences[e.id]}
                peutGerer={peutGerer}
                onModifier={() => setEdition(e)}
              />
            ))}
          </section>
        ))
      )}

      {edition && (
        <FormulaireEvenement evenement={edition === "nouveau" ? null : edition} onFermer={() => setEdition(null)} />
      )}
    </div>
  );
}

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={actif}
      onClick={onClick}
      className={`h-10 flex-none rounded-full border px-4 text-sm font-medium ${
        actif ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Carte d'un événement                                                 */
/* ------------------------------------------------------------------ */

function CarteEvenement({
  e,
  passe,
  presence,
  peutGerer,
  onModifier,
}: {
  e: Evenement;
  passe: boolean;
  presence?: string;
  peutGerer: boolean;
  onModifier: () => void;
}) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const debut = new Date(e.date_debut);
  const enCours = !passe && debut.getTime() <= Date.now();
  const type = TYPES[e.type];

  async function supprimer() {
    setSuppression(true);
    const { error } = await createClient().from("evenements").delete().eq("id", e.id);
    setSuppression(false);
    if (!error) router.refresh();
  }

  return (
    <article
      className={`flex gap-4 rounded-2xl border bg-surface p-4 md:p-5 ${enCours ? "border-or" : "border-bordure"} ${
        passe ? "opacity-80" : ""
      }`}
    >
      <div className="flex w-14 flex-none flex-col items-center justify-center rounded-xl bg-[#221f1b] py-2 text-center">
        <span className="text-[11px] text-muet capitalize">{fmtJourSemaine.format(debut)}</span>
        <span className="text-2xl leading-tight font-semibold">{fmtJour.format(debut)}</span>
        <span className="text-[11px] text-muet uppercase">{fmtMoisCourt.format(debut)}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${type.classe}`}>{type.label}</span>
          {enCours && <span className="text-xs font-semibold text-or">En cours</span>}
        </div>
        <h3 className="text-lg leading-snug font-semibold">{e.titre}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-doux">
          <span className="flex items-center gap-1.5">
            <Clock size={15} className="text-muet" aria-hidden />
            {fmtHeure.format(debut)}
            {e.date_fin ? ` – ${fmtHeure.format(new Date(e.date_fin))}` : ""}
          </span>
          {e.lieu && (
            <span className="flex items-center gap-1.5">
              <MapPin size={15} className="text-muet" aria-hidden />
              {e.lieu}
            </span>
          )}
        </div>
        {e.description && <p className="text-sm whitespace-pre-line text-muet">{e.description}</p>}

        {passe && (
          <p className={`text-sm font-medium ${presence ? PRESENCES[presence]?.classe : "text-muet"}`}>
            {presence ? `Ma présence : ${PRESENCES[presence]?.label ?? presence}` : "Présence non notée"}
          </p>
        )}

        <div className="mt-1 flex flex-wrap gap-2">
          {!passe && (
            <button
              onClick={() => telechargerIcs(e)}
              className="flex h-10 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm"
            >
              <CalendarPlus size={16} aria-hidden /> Ajouter à mon agenda
            </button>
          )}
          {peutGerer && !confirmer && (
            <>
              <button
                onClick={onModifier}
                className="flex h-10 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm"
              >
                <Pencil size={15} aria-hidden /> Modifier
              </button>
              <button
                onClick={() => setConfirmer(true)}
                aria-label={`Supprimer ${e.titre}`}
                className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muet hover:text-alerte"
              >
                <Trash2 size={15} aria-hidden /> Supprimer
              </button>
            </>
          )}
          {peutGerer && confirmer && (
            <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-velours-clair/40 bg-velours/10 p-3">
              <span className="flex-1 text-sm text-alerte">
                Supprimer cet événement ? Les présences notées seront aussi effacées.
              </span>
              <button onClick={() => setConfirmer(false)} className="h-10 rounded-full px-3.5 text-sm text-doux">
                Annuler
              </button>
              <button
                onClick={supprimer}
                disabled={suppression}
                className="flex h-10 items-center gap-1.5 rounded-full bg-velours px-4 text-sm font-semibold text-white"
              >
                {suppression && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Formulaire création / modification                                   */
/* ------------------------------------------------------------------ */

const champ = "h-12 w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 focus:border-or focus:outline-none";

function FormulaireEvenement({ evenement, onFermer }: { evenement: Evenement | null; onFermer: () => void }) {
  const router = useRouter();
  const debut = versChamps(evenement?.date_debut ?? null);
  const fin = versChamps(evenement?.date_fin ?? null);

  const [titre, setTitre] = useState(evenement?.titre ?? "");
  const [type, setType] = useState<TypeEvt>(evenement?.type ?? "REPETITION");
  const [date, setDate] = useState(debut.date);
  const [heureDebut, setHeureDebut] = useState(debut.heure || "18:00");
  const [heureFin, setHeureFin] = useState(fin.heure);
  const [lieu, setLieu] = useState(evenement?.lieu ?? "");
  const [description, setDescription] = useState(evenement?.description ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer(ev: React.FormEvent) {
    ev.preventDefault();
    setErreur(null);
    if (!date) return setErreur("Choisis une date.");

    const dDebut = new Date(`${date}T${heureDebut}`);
    let dFin: Date | null = heureFin ? new Date(`${date}T${heureFin}`) : null;
    // Fin avant le début (ex. 20:00 → 01:00) : l'événement se termine le lendemain
    if (dFin && dFin <= dDebut) dFin = new Date(dFin.getTime() + 24 * 3600 * 1000);

    const valeurs = {
      titre: titre.trim(),
      type,
      date_debut: dDebut.toISOString(),
      date_fin: dFin ? dFin.toISOString() : null,
      lieu: lieu.trim() || null,
      description: description.trim() || null,
    };

    setEnvoi(true);
    const supabase = createClient();
    let error;
    if (evenement) {
      ({ error } = await supabase.from("evenements").update(valeurs).eq("id", evenement.id));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      ({ error } = await supabase.from("evenements").insert({ ...valeurs, cree_par: user?.id }));
    }
    setEnvoi(false);

    if (error) return setErreur("Enregistrement impossible : " + error.message);
    onFermer();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center md:p-6"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={evenement ? "Modifier l'événement" : "Nouvel événement"}
        onClick={(e) => e.stopPropagation()}
        className="pb-safe max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-bordure-2 bg-surface p-5 md:rounded-3xl md:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{evenement ? "Modifier l'événement" : "Nouvel événement"}</h2>
          <button
            onClick={onFermer}
            aria-label="Fermer"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muet hover:bg-surface-2"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={enregistrer} className="flex flex-col gap-4">
          <Champ id="titre" label="Titre">
            <input id="titre" required value={titre} onChange={(e) => setTitre(e.target.value)} className={champ} placeholder="Ex. Répétition générale" />
          </Champ>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm text-doux">Type</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPES) as TypeEvt[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={`h-11 rounded-xl border text-sm font-medium ${
                    type === t ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"
                  }`}
                >
                  {TYPES[t].label}
                </button>
              ))}
            </div>
          </fieldset>

          <Champ id="date" label="Date">
            <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={champ} />
          </Champ>
          <div className="flex gap-3">
            <Champ id="debut" label="Début">
              <input id="debut" type="time" required value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} className={champ} />
            </Champ>
            <Champ id="fin" label="Fin (facultatif)">
              <input id="fin" type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} className={champ} />
            </Champ>
          </div>
          <Champ id="lieu" label="Lieu">
            <input id="lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} className={champ} placeholder="Ex. Amphi B" />
          </Champ>
          <Champ id="description" label="Description (facultatif)">
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 py-3 focus:border-or focus:outline-none"
              placeholder="Ce qu'il faut apporter, qui est concerné…"
            />
          </Champ>

          {erreur && (
            <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
              {erreur}
            </p>
          )}

          <button
            disabled={envoi}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white disabled:opacity-60"
          >
            {envoi && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
            {evenement ? "Enregistrer les modifications" : "Créer l'événement"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Champ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-doux">
        {label}
      </label>
      {children}
    </div>
  );
}
