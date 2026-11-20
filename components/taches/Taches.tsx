"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/nav/Avatar";

/* ------------------------------------------------------------------ */
/* Types et constantes partagés                                         */
/* ------------------------------------------------------------------ */

export type StatutTache = "A_FAIRE" | "EN_COURS" | "TERMINE";
export type Priorite = "BASSE" | "NORMALE" | "HAUTE" | "URGENTE";

export interface Personne {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  poste: string | null;
  avatar_url: string | null;
}

export interface Tache {
  id: string;
  titre: string;
  description: string | null;
  statut: StatutTache;
  priorite: Priorite;
  deadline: string | null;
  assigne_a: string;
  assigne_par: string | null;
  cree_le: string;
  /** jointures */
  assigne?: { prenom: string; nom: string; avatar_url: string | null } | null;
  auteur?: { prenom: string; nom: string } | null;
}

const FUSEAU = "Africa/Casablanca";

const STATUTS: { cle: StatutTache; label: string; point: string }[] = [
  { cle: "A_FAIRE", label: "À faire", point: "bg-muet" },
  { cle: "EN_COURS", label: "En cours", point: "bg-or" },
  { cle: "TERMINE", label: "Terminé", point: "bg-succes" },
];

const PRIORITES: Record<Priorite, { label: string; classe: string }> = {
  URGENTE: { label: "Urgente", classe: "bg-[#3a1714] text-alerte" },
  HAUTE: { label: "Haute", classe: "bg-[#3a2e14] text-or-clair" },
  NORMALE: { label: "Normale", classe: "bg-[#262320] text-doux" },
  BASSE: { label: "Basse", classe: "bg-[#16202b] text-[#8cb8e8]" },
};
const ORDRE_PRIORITE: Priorite[] = ["URGENTE", "HAUTE", "NORMALE", "BASSE"];

const fmtEcheance = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: FUSEAU });

function enRetard(t: Tache) {
  return t.statut !== "TERMINE" && !!t.deadline && new Date(t.deadline).getTime() < Date.now();
}

function trierTaches(a: Tache, b: Tache) {
  const p = ORDRE_PRIORITE.indexOf(a.priorite) - ORDRE_PRIORITE.indexOf(b.priorite);
  if (p !== 0) return p;
  return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
}

function Echeance({ t }: { t: Tache }) {
  if (!t.deadline) return null;
  const retard = enRetard(t);
  return (
    <span className={`flex items-center gap-1 text-xs ${retard ? "font-semibold text-alerte" : "text-muet"}`}>
      <Calendar size={13} aria-hidden />
      {retard ? "En retard · " : ""}
      {fmtEcheance.format(new Date(t.deadline))}
    </span>
  );
}

function BadgePriorite({ p }: { p: Priorite }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITES[p].classe}`}>{PRIORITES[p].label}</span>;
}

/* ------------------------------------------------------------------ */
/* MES TÂCHES : Kanban de la personne connectée                         */
/* ------------------------------------------------------------------ */

export function MesTaches({ taches: initiales }: { taches: Tache[] }) {
  const [taches, setTaches] = useState(initiales);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [colonne, setColonne] = useState<StatutTache>("A_FAIRE"); // onglet affiché sur téléphone

  async function deplacer(t: Tache, statut: StatutTache) {
    setEnCours(t.id);
    setErreur(null);
    const { error } = await createClient().from("taches").update({ statut }).eq("id", t.id);
    setEnCours(null);
    if (error) return setErreur("Impossible de changer le statut : " + error.message);
    setTaches((ts) => ts.map((x) => (x.id === t.id ? { ...x, statut } : x)));
  }

  const parStatut = (s: StatutTache) => taches.filter((t) => t.statut === s).sort(trierTaches);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Mes tâches</h1>
        <p className="text-doux">Fais avancer tes tâches : le Bureau voit leur progression en direct.</p>
      </div>

      {erreur && (
        <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
          {erreur}
        </p>
      )}

      {/* Onglets de colonnes (téléphone) */}
      <div role="tablist" aria-label="Colonne" className="flex rounded-full border border-bordure bg-surface p-1 md:hidden">
        {STATUTS.map((s) => (
          <button
            key={s.cle}
            role="tab"
            aria-selected={colonne === s.cle}
            onClick={() => setColonne(s.cle)}
            className={`h-10 flex-1 rounded-full text-sm font-semibold ${colonne === s.cle ? "bg-or text-encre" : "text-doux"}`}
          >
            {s.label} ({parStatut(s.cle).length})
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STATUTS.map((s, i) => (
          <section
            key={s.cle}
            className={`flex-col gap-3 rounded-2xl border border-bordure bg-fond-2 p-3 md:flex ${colonne === s.cle ? "flex" : "hidden"}`}
          >
            <h2 className="hidden items-center gap-2 px-1 pt-1 text-sm font-semibold md:flex">
              <span className={`h-2.5 w-2.5 rounded-full ${s.point}`} aria-hidden />
              {s.label}
              <span className="ml-auto text-muet">{parStatut(s.cle).length}</span>
            </h2>
            {parStatut(s.cle).length === 0 && (
              <p className="rounded-xl border border-dashed border-bordure-2 p-5 text-center text-sm text-muet">
                {s.cle === "A_FAIRE" ? "Rien à faire pour l'instant." : "Aucune tâche ici."}
              </p>
            )}
            {parStatut(s.cle).map((t) => (
              <article
                key={t.id}
                className={`flex flex-col gap-2.5 rounded-xl border bg-surface p-4 ${enRetard(t) ? "border-velours-clair/60" : "border-bordure"} ${
                  enCours === t.id ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <BadgePriorite p={t.priorite} />
                  <Echeance t={t} />
                </div>
                <h3 className={`font-semibold leading-snug ${t.statut === "TERMINE" ? "text-muet line-through" : ""}`}>{t.titre}</h3>
                {t.description && <p className="text-sm whitespace-pre-line text-muet">{t.description}</p>}
                {t.auteur && (
                  <p className="text-xs text-muet">
                    Assignée par {t.auteur.prenom} {t.auteur.nom}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  {i > 0 && (
                    <button
                      onClick={() => deplacer(t, STATUTS[i - 1].cle)}
                      disabled={enCours === t.id}
                      aria-label={`Remettre « ${t.titre} » en ${STATUTS[i - 1].label}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-bordure-2 text-muet"
                    >
                      <ArrowLeft size={16} aria-hidden />
                    </button>
                  )}
                  {i < STATUTS.length - 1 && (
                    <button
                      onClick={() => deplacer(t, STATUTS[i + 1].cle)}
                      disabled={enCours === t.id}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-or px-3 text-sm font-semibold text-or"
                    >
                      {i === 0 ? "Commencer" : "Marquer terminé"} <ArrowRight size={16} aria-hidden />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ASSIGNER DES TÂCHES : vue Président                                  */
/* ------------------------------------------------------------------ */

type Filtre = "TOUTES" | StatutTache | "RETARD";

export function GestionTaches({ taches, personnes, monId }: { taches: Tache[]; personnes: Personne[]; monId: string }) {
  const [filtre, setFiltre] = useState<Filtre>("TOUTES");
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState<Tache | "nouvelle" | null>(null);

  const r = recherche.trim().toLowerCase();
  const visibles = useMemo(
    () =>
      taches
        .filter((t) =>
          filtre === "TOUTES" ? true : filtre === "RETARD" ? enRetard(t) : t.statut === filtre
        )
        .filter(
          (t) =>
            !r ||
            `${t.titre} ${t.assigne?.prenom ?? ""} ${t.assigne?.nom ?? ""}`.toLowerCase().includes(r)
        )
        .sort((a, b) => Number(a.statut === "TERMINE") - Number(b.statut === "TERMINE") || trierTaches(a, b)),
    [taches, filtre, r]
  );

  const nb = (f: Filtre) =>
    taches.filter((t) => (f === "TOUTES" ? true : f === "RETARD" ? enRetard(t) : t.statut === f)).length;

  const filtres: [Filtre, string][] = [
    ["TOUTES", "Toutes"],
    ["A_FAIRE", "À faire"],
    ["EN_COURS", "En cours"],
    ["TERMINE", "Terminées"],
    ["RETARD", "En retard"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Assigner des tâches</h1>
          <p className="text-doux">Crée une tâche pour une ou plusieurs personnes et suis son avancement.</p>
        </div>
        <button
          onClick={() => setEdition("nouvelle")}
          className="flex h-11 items-center gap-2 rounded-full bg-velours px-5 font-semibold text-white"
        >
          <Plus size={18} aria-hidden /> Nouvelle tâche
        </button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filtrer">
        {filtres.map(([f, label]) => (
          <button
            key={f}
            aria-pressed={filtre === f}
            onClick={() => setFiltre(f)}
            className={`h-10 flex-none rounded-full border px-4 text-sm font-medium ${
              filtre === f
                ? "border-or bg-or text-encre"
                : f === "RETARD" && nb("RETARD") > 0
                  ? "border-velours-clair/60 text-alerte"
                  : "border-bordure-2 text-doux"
            }`}
          >
            {label} ({nb(f)})
          </button>
        ))}
      </div>

      <label className="flex h-11 items-center gap-2 rounded-full border border-bordure-2 bg-surface px-4">
        <Search size={16} className="text-muet" aria-hidden />
        <span className="sr-only">Rechercher</span>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une tâche ou une personne…"
          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
      </label>

      <ul className="flex flex-col gap-2.5">
        {visibles.length === 0 && (
          <li className="rounded-2xl border border-dashed border-bordure-2 bg-surface p-8 text-center text-muet">
            {taches.length === 0 ? "Aucune tâche pour l'instant. Crée la première avec « Nouvelle tâche »." : "Aucune tâche ici."}
          </li>
        )}
        {visibles.map((t) => (
          <LigneTache key={t.id} t={t} onModifier={() => setEdition(t)} />
        ))}
      </ul>

      {edition && (
        <FormulaireTache
          tache={edition === "nouvelle" ? null : edition}
          personnes={personnes}
          monId={monId}
          onFermer={() => setEdition(null)}
        />
      )}
    </div>
  );
}

function LigneTache({ t, onModifier }: { t: Tache; onModifier: () => void }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const statut = STATUTS.find((s) => s.cle === t.statut)!;

  async function supprimer() {
    setSuppression(true);
    const { error } = await createClient().from("taches").delete().eq("id", t.id);
    setSuppression(false);
    if (!error) router.refresh();
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-2xl border bg-surface p-4 md:flex-row md:items-center ${
        enRetard(t) ? "border-velours-clair/60" : "border-bordure"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {t.assigne && <Avatar prenom={t.assigne.prenom} nom={t.assigne.nom} chemin={t.assigne.avatar_url} taille={38} bordure={false} />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={`font-semibold ${t.statut === "TERMINE" ? "text-muet line-through" : ""}`}>{t.titre}</span>
          <span className="text-sm text-doux">
            {t.assigne ? `${t.assigne.prenom} ${t.assigne.nom}` : "Personne supprimée"}
          </span>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="flex items-center gap-1.5 text-xs text-doux">
              <span className={`h-2 w-2 rounded-full ${statut.point}`} aria-hidden />
              {statut.label}
            </span>
            <BadgePriorite p={t.priorite} />
            <Echeance t={t} />
          </div>
        </div>
      </div>

      {!confirmer ? (
        <div className="flex gap-2 md:flex-none">
          <button onClick={onModifier} className="flex h-10 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm">
            <Pencil size={15} aria-hidden /> Modifier
          </button>
          <button
            onClick={() => setConfirmer(true)}
            aria-label={`Supprimer ${t.titre}`}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muet hover:text-alerte"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-velours-clair/40 bg-velours/10 p-2.5 md:flex-none">
          <span className="text-sm text-alerte">Supprimer cette tâche ?</span>
          <button onClick={() => setConfirmer(false)} className="h-9 rounded-full px-3 text-sm text-doux">
            Annuler
          </button>
          <button
            onClick={supprimer}
            disabled={suppression}
            className="flex h-9 items-center gap-1.5 rounded-full bg-velours px-3.5 text-sm font-semibold text-white"
          >
            {suppression && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
            Supprimer
          </button>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Formulaire création / modification                                   */
/* ------------------------------------------------------------------ */

const champ = "h-12 w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 focus:border-or focus:outline-none";

function versDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: FUSEAU }).slice(0, 10) : "";
}

function FormulaireTache({
  tache,
  personnes,
  monId,
  onFermer,
}: {
  tache: Tache | null;
  personnes: Personne[];
  monId: string;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [titre, setTitre] = useState(tache?.titre ?? "");
  const [description, setDescription] = useState(tache?.description ?? "");
  const [priorite, setPriorite] = useState<Priorite>(tache?.priorite ?? "NORMALE");
  const [echeance, setEcheance] = useState(versDate(tache?.deadline ?? null));
  const [statut, setStatut] = useState<StatutTache>(tache?.statut ?? "A_FAIRE");
  const [choisis, setChoisis] = useState<Set<string>>(new Set(tache ? [tache.assigne_a] : []));
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const r = recherche.trim().toLowerCase();
  const filtrees = personnes.filter((p) => !r || `${p.prenom} ${p.nom}`.toLowerCase().includes(r));
  const bureau = personnes.filter((p) => p.role !== "MEMBRE");

  function basculer(id: string) {
    setChoisis((s) => {
      const n = new Set(tache ? [] : s); // en modification : une seule personne
      if (s.has(id) && !tache) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function enregistrer(ev: React.FormEvent) {
    ev.preventDefault();
    setErreur(null);
    if (choisis.size === 0) return setErreur("Choisis au moins une personne.");

    // Échéance : fin de journée (23:59) à l'heure du Maroc
    const deadline = echeance ? new Date(`${echeance}T23:59:00`).toISOString() : null;
    const valeurs = { titre: titre.trim(), description: description.trim() || null, priorite, deadline };

    setEnvoi(true);
    const supabase = createClient();
    const { error } = tache
      ? await supabase
          .from("taches")
          .update({ ...valeurs, statut, assigne_a: [...choisis][0] })
          .eq("id", tache.id)
      : await supabase
          .from("taches")
          .insert([...choisis].map((id) => ({ ...valeurs, assigne_a: id, assigne_par: monId })));
    setEnvoi(false);

    if (error) return setErreur("Enregistrement impossible : " + error.message);
    onFermer();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center md:p-6" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tache ? "Modifier la tâche" : "Nouvelle tâche"}
        onClick={(e) => e.stopPropagation()}
        className="pb-safe max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-bordure-2 bg-surface p-5 md:rounded-3xl md:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{tache ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
          <button onClick={onFermer} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-full text-muet hover:bg-surface-2">
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={enregistrer} className="flex flex-col gap-4">
          <Champ id="titre" label="Tâche">
            <input id="titre" required value={titre} onChange={(e) => setTitre(e.target.value)} className={champ} placeholder="Ex. Réserver l'amphi pour la générale" />
          </Champ>
          <Champ id="desc" label="Détails (facultatif)">
            <textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 py-3 focus:border-or focus:outline-none"
            />
          </Champ>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm text-doux">Priorité</legend>
            <div className="grid grid-cols-4 gap-2">
              {ORDRE_PRIORITE.map((p) => (
                <button
                  type="button"
                  key={p}
                  aria-pressed={priorite === p}
                  onClick={() => setPriorite(p)}
                  className={`h-11 rounded-xl border text-sm font-medium ${priorite === p ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"}`}
                >
                  {PRIORITES[p].label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3">
            <Champ id="echeance" label="Échéance (facultatif)">
              <input id="echeance" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} className={champ} />
            </Champ>
            {tache && (
              <Champ id="statut" label="Statut">
                <select id="statut" value={statut} onChange={(e) => setStatut(e.target.value as StatutTache)} className={champ}>
                  {STATUTS.map((s) => (
                    <option key={s.cle} value={s.cle}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Champ>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 flex w-full items-center justify-between text-sm text-doux">
              <span>
                {tache ? "Assignée à" : "Assigner à"}
                {!tache && choisis.size > 0 && <span className="ml-1.5 font-semibold text-or">({choisis.size})</span>}
              </span>
              {!tache && (
                <span className="flex gap-3">
                  <button type="button" onClick={() => setChoisis(new Set(bureau.map((p) => p.id)))} className="text-xs text-or">
                    Tout le Bureau
                  </button>
                  {choisis.size > 0 && (
                    <button type="button" onClick={() => setChoisis(new Set())} className="text-xs text-muet">
                      Effacer
                    </button>
                  )}
                </span>
              )}
            </legend>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-bordure-2 bg-fond-2 px-3.5">
              <Search size={15} className="text-muet" aria-hidden />
              <span className="sr-only">Rechercher une personne</span>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher…"
                className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
              />
            </label>
            <ul className="flex max-h-56 flex-col overflow-y-auto rounded-xl border border-bordure">
              {filtrees.map((p) => {
                const actif = choisis.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => basculer(p.id)}
                      aria-pressed={actif}
                      className={`flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left ${actif ? "bg-[#2a2213]" : "hover:bg-surface-2"}`}
                    >
                      <Avatar prenom={p.prenom} nom={p.nom} chemin={p.avatar_url} taille={30} bordure={false} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {p.prenom} {p.nom}
                        {p.role !== "MEMBRE" && <span className="ml-2 text-xs text-or-clair">{p.poste ?? "Bureau"}</span>}
                      </span>
                      <span
                        className={`flex h-5 w-5 flex-none items-center justify-center rounded border text-xs ${
                          actif ? "border-or bg-or text-encre" : "border-bordure-2"
                        }`}
                        aria-hidden
                      >
                        {actif ? "✓" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtrees.length === 0 && <li className="p-4 text-center text-sm text-muet">Personne trouvée.</li>}
            </ul>
          </fieldset>

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
            {tache ? "Enregistrer" : choisis.size > 1 ? `Assigner à ${choisis.size} personnes` : "Assigner la tâche"}
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
