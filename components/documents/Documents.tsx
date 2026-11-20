"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, FileUp, Lock, LoaderCircle, Plus, Search, Trash2, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Categorie = "COMPTE_RENDU" | "DEMANDE_OFFICIELLE" | "SCENARIO" | "AUTRE";
export type Visibilite = "BUREAU" | "MEMBRES";

export interface DocumentClub {
  id: string;
  titre: string;
  categorie: Categorie;
  visibilite: Visibilite;
  fichier_url: string;
  date_creation: string;
  auteur?: { prenom: string; nom: string } | null;
}

export const CATEGORIES: Record<Categorie, string> = {
  SCENARIO: "Scénarios",
  COMPTE_RENDU: "Comptes rendus",
  DEMANDE_OFFICIELLE: "Courriers officiels",
  AUTRE: "Autres",
};

const BUCKET = "documents";
const TAILLE_MAX = 50 * 1024 * 1024;
const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Casablanca" });

function extension(chemin: string) {
  const e = chemin.split(".").pop();
  return e && e.length <= 5 ? e.toUpperCase() : "";
}

async function ouvrir(chemin: string) {
  const fenetre = window.open("", "_blank");
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(chemin, 300);
  if (error || !data) {
    fenetre?.close();
    alert("Le document n'a pas pu être ouvert.");
    return;
  }
  if (fenetre) fenetre.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

export function Documents({
  documents,
  peutGerer,
  estBureau,
  monId,
}: {
  documents: DocumentClub[];
  peutGerer: boolean;
  estBureau: boolean;
  monId: string;
}) {
  const [filtre, setFiltre] = useState<Categorie | "TOUS">("TOUS");
  const [recherche, setRecherche] = useState("");
  const [ajout, setAjout] = useState(false);

  const r = recherche.trim().toLowerCase();
  const visibles = useMemo(
    () => documents.filter((d) => (filtre === "TOUS" || d.categorie === filtre) && (!r || d.titre.toLowerCase().includes(r))),
    [documents, filtre, r]
  );
  const nb = (c: Categorie | "TOUS") => (c === "TOUS" ? documents.length : documents.filter((d) => d.categorie === c).length);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">{peutGerer ? "Archives & documents" : "Documents"}</h1>
          <p className="text-doux">
            {peutGerer
              ? "Range les documents du club et choisis qui peut les voir : le Bureau seulement, ou tous les membres."
              : "Scénarios et documents partagés par le Bureau."}
          </p>
        </div>
        {peutGerer && (
          <button onClick={() => setAjout(true)} className="flex h-11 items-center gap-2 rounded-full bg-velours px-5 font-semibold text-white">
            <Plus size={18} aria-hidden /> Ajouter un document
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Catégorie">
        {(["TOUS", ...(Object.keys(CATEGORIES) as Categorie[])] as const).map((c) => (
          <button
            key={c}
            aria-pressed={filtre === c}
            onClick={() => setFiltre(c)}
            className={`h-10 flex-none rounded-full border px-4 text-sm font-medium ${
              filtre === c ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"
            }`}
          >
            {c === "TOUS" ? "Tous" : CATEGORIES[c]} ({nb(c)})
          </button>
        ))}
      </div>

      <label className="flex h-11 items-center gap-2 rounded-full border border-bordure-2 bg-surface px-4">
        <Search size={16} className="text-muet" aria-hidden />
        <span className="sr-only">Rechercher</span>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un document…"
          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
      </label>

      <ul className="flex flex-col gap-2.5">
        {visibles.length === 0 && (
          <li className="rounded-2xl border border-dashed border-bordure-2 bg-surface p-8 text-center text-muet">
            {documents.length === 0 ? "Aucun document pour l'instant." : "Aucun document ici."}
          </li>
        )}
        {visibles.map((d) => (
          <LigneDocument key={d.id} d={d} peutGerer={peutGerer} estBureau={estBureau} />
        ))}
      </ul>

      {ajout && <FormulaireDocument monId={monId} onFermer={() => setAjout(false)} />}
    </div>
  );
}

function LigneDocument({ d, peutGerer, estBureau }: { d: DocumentClub; peutGerer: boolean; estBureau: boolean }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);

  async function supprimer() {
    setOccupe(true);
    const supabase = createClient();
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (!error) await supabase.storage.from(BUCKET).remove([d.fichier_url]);
    setOccupe(false);
    if (!error) router.refresh();
  }

  async function basculerVisibilite() {
    setOccupe(true);
    await createClient()
      .from("documents")
      .update({ visibilite: d.visibilite === "BUREAU" ? "MEMBRES" : "BUREAU" })
      .eq("id", d.id);
    setOccupe(false);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-bordure bg-surface p-4 md:flex-row md:items-center">
      <button onClick={() => ouvrir(d.fichier_url)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl bg-[#2a2213] text-or">
          <FileText size={18} aria-hidden />
          <span className="text-[9px] font-bold">{extension(d.fichier_url)}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold">{d.titre}</span>
          <span className="text-xs text-muet">
            {CATEGORIES[d.categorie]} · {fmtDate.format(new Date(d.date_creation))}
            {d.auteur ? ` · ${d.auteur.prenom} ${d.auteur.nom}` : ""}
          </span>
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-2 md:flex-none">
        {estBureau && (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              d.visibilite === "BUREAU" ? "bg-[#3a1714] text-alerte" : "bg-[#1e2a1f] text-succes"
            }`}
          >
            {d.visibilite === "BUREAU" ? <Lock size={12} aria-hidden /> : <Users size={12} aria-hidden />}
            {d.visibilite === "BUREAU" ? "Bureau" : "Membres"}
          </span>
        )}
        <button onClick={() => ouvrir(d.fichier_url)} className="flex h-10 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm">
          <Eye size={15} aria-hidden /> Ouvrir
        </button>
        {peutGerer && !confirmer && (
          <>
            <button
              onClick={basculerVisibilite}
              disabled={occupe}
              className="h-10 rounded-full px-3 text-sm text-doux hover:text-texte"
              title="Changer qui peut voir ce document"
            >
              {d.visibilite === "BUREAU" ? "Partager aux membres" : "Réserver au Bureau"}
            </button>
            <button
              onClick={() => setConfirmer(true)}
              aria-label={`Supprimer ${d.titre}`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muet hover:text-alerte"
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </>
        )}
        {confirmer && (
          <span className="flex flex-wrap items-center gap-2 rounded-xl border border-velours-clair/40 bg-velours/10 p-2">
            <span className="text-sm text-alerte">Supprimer définitivement ?</span>
            <button onClick={() => setConfirmer(false)} className="h-9 rounded-full px-3 text-sm text-doux">
              Annuler
            </button>
            <button
              onClick={supprimer}
              disabled={occupe}
              className="flex h-9 items-center gap-1.5 rounded-full bg-velours px-3.5 text-sm font-semibold text-white"
            >
              {occupe && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
              Supprimer
            </button>
          </span>
        )}
      </div>
    </li>
  );
}

const champ = "h-12 w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 focus:border-or focus:outline-none";

function FormulaireDocument({ monId, onFermer }: { monId: string; onFermer: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState<Categorie>("SCENARIO");
  const [visibilite, setVisibilite] = useState<Visibilite>("MEMBRES");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setErreur(null);
    if (!f) return;
    if (f.size > TAILLE_MAX) return setErreur("Le fichier dépasse 50 Mo.");
    setFichier(f);
    if (!titre) setTitre(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  }

  async function enregistrer(ev: React.FormEvent) {
    ev.preventDefault();
    if (!fichier) return setErreur("Choisis un fichier.");
    setEnvoi(true);
    setErreur(null);
    const supabase = createClient();
    const ext = (fichier.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const chemin = `${categorie.toLowerCase()}/${crypto.randomUUID()}.${ext}`;

    const { error: errFichier } = await supabase.storage
      .from(BUCKET)
      .upload(chemin, fichier, { contentType: fichier.type || "application/octet-stream" });
    if (errFichier) {
      setEnvoi(false);
      return setErreur("Envoi du fichier impossible : " + errFichier.message);
    }
    const { error } = await supabase
      .from("documents")
      .insert({ titre: titre.trim(), categorie, visibilite, fichier_url: chemin, uploade_par: monId });
    if (error) await supabase.storage.from(BUCKET).remove([chemin]);
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
        aria-label="Ajouter un document"
        onClick={(e) => e.stopPropagation()}
        className="pb-safe max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-bordure-2 bg-surface p-5 md:rounded-3xl md:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Ajouter un document</h2>
          <button onClick={onFermer} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-full text-muet hover:bg-surface-2">
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={enregistrer} className="flex flex-col gap-4">
          <input ref={input} type="file" className="hidden" onChange={choisir} />
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={`flex min-h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm ${
              fichier ? "border-succes text-succes" : "border-bordure-2 text-muet"
            }`}
          >
            <FileUp size={20} aria-hidden />
            <span className="truncate">{fichier ? fichier.name : "Choisir un fichier (PDF, Word, image… 50 Mo max)"}</span>
          </button>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="titre-doc" className="text-sm text-doux">Titre</label>
            <input id="titre-doc" required value={titre} onChange={(e) => setTitre(e.target.value)} className={champ} />
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm text-doux">Catégorie</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORIES) as Categorie[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-pressed={categorie === c}
                  onClick={() => setCategorie(c)}
                  className={`h-11 rounded-xl border text-sm font-medium ${categorie === c ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"}`}
                >
                  {CATEGORIES[c]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm text-doux">Qui peut le voir ?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["MEMBRES", "Tous les membres", Users],
                  ["BUREAU", "Bureau seulement", Lock],
                ] as const
              ).map(([v, label, I]) => (
                <button
                  type="button"
                  key={v}
                  aria-pressed={visibilite === v}
                  onClick={() => setVisibilite(v)}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium ${
                    visibilite === v ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"
                  }`}
                >
                  <I size={14} aria-hidden /> {label}
                </button>
              ))}
            </div>
          </fieldset>

          {erreur && (
            <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
              {erreur}
            </p>
          )}

          <button disabled={envoi} className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white disabled:opacity-60">
            {envoi && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
            Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}
