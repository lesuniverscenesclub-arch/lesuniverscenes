"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, Clock, FileDown, FileUp, LoaderCircle, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Types et constantes                                                  */
/* ------------------------------------------------------------------ */

export type TypeDocument = "ATTESTATION_MEMBRE" | "ATTESTATION_PARTICIPATION" | "AUTORISATION_ABSENCE" | "AUTRE";
export type StatutDemande = "EN_ATTENTE" | "VALIDE" | "REFUSE";

export interface Demande {
  id: string;
  user_id: string;
  type_document: TypeDocument;
  motif: string | null;
  statut: StatutDemande;
  fichier_genere_url: string | null;
  commentaire_bureau: string | null;
  date_demande: string;
  date_traitement: string | null;
  demandeur?: { prenom: string; nom: string; email: string } | null;
  traiteur?: { prenom: string; nom: string } | null;
}

export const TYPES_DOCUMENT: Record<TypeDocument, string> = {
  ATTESTATION_MEMBRE: "Attestation de membre",
  ATTESTATION_PARTICIPATION: "Attestation de participation",
  AUTORISATION_ABSENCE: "Autorisation d'absence",
  AUTRE: "Autre document",
};

const STATUTS: Record<StatutDemande, { label: string; classe: string; Icone: typeof Clock }> = {
  EN_ATTENTE: { label: "En attente", classe: "bg-[#2a2213] text-or-clair", Icone: Clock },
  VALIDE: { label: "Validée", classe: "bg-[#1e2a1f] text-succes", Icone: CircleCheck },
  REFUSE: { label: "Refusée", classe: "bg-[#3a1714] text-alerte", Icone: CircleX },
};

const BUCKET = "demandes";
const TAILLE_MAX = 10 * 1024 * 1024; // limite du bucket : 10 Mo

const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Casablanca" });

function BadgeStatut({ s }: { s: StatutDemande }) {
  const { label, classe, Icone } = STATUTS[s];
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classe}`}>
      <Icone size={13} aria-hidden /> {label}
    </span>
  );
}

/** Lien temporaire (5 min) vers le PDF : le bucket est privé. */
async function ouvrirPdf(chemin: string) {
  const fenetre = window.open("", "_blank"); // ouvert tout de suite pour ne pas être bloqué
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(chemin, 300);
  if (error || !data) {
    fenetre?.close();
    alert("Le document n'a pas pu être ouvert.");
    return;
  }
  if (fenetre) fenetre.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

/* ------------------------------------------------------------------ */
/* GUICHET : côté membre                                                */
/* ------------------------------------------------------------------ */

export function Guichet({ demandes, monId }: { demandes: Demande[]; monId: string }) {
  const router = useRouter();
  const [formulaire, setFormulaire] = useState(demandes.length === 0);
  const [type, setType] = useState<TypeDocument>("ATTESTATION_MEMBRE");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [annulation, setAnnulation] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    const { error } = await createClient()
      .from("demandes_administratives")
      .insert({ user_id: monId, type_document: type, motif: motif.trim() || null });
    setEnvoi(false);
    if (error) return setMessage({ ok: false, texte: "La demande n'a pas pu être envoyée : " + error.message });
    setMotif("");
    setFormulaire(false);
    setMessage({ ok: true, texte: "Demande envoyée ! Le Bureau va la traiter : tu verras son statut ici." });
    router.refresh();
  }

  async function annuler(id: string) {
    setAnnulation(id);
    await createClient().from("demandes_administratives").delete().eq("id", id);
    setAnnulation(null);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Guichet administratif</h1>
          <p className="text-doux">Demande un document officiel du club et télécharge-le une fois validé.</p>
        </div>
        {!formulaire && (
          <button onClick={() => setFormulaire(true)} className="flex h-11 items-center gap-2 rounded-full bg-velours px-5 font-semibold text-white">
            <Plus size={18} aria-hidden /> Nouvelle demande
          </button>
        )}
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm ${
            message.ok ? "border-succes/40 bg-succes/10 text-succes" : "border-velours-clair/40 bg-velours/10 text-alerte"
          }`}
        >
          {message.texte}
        </p>
      )}

      {formulaire && (
        <form onSubmit={envoyer} className="flex flex-col gap-4 rounded-2xl border border-or/50 bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nouvelle demande</h2>
            {demandes.length > 0 && (
              <button type="button" onClick={() => setFormulaire(false)} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-full text-muet">
                <X size={18} aria-hidden />
              </button>
            )}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-doux">Document souhaité</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(TYPES_DOCUMENT) as TypeDocument[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={`min-h-12 rounded-xl border px-3 text-left text-sm font-medium ${
                    type === t ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"
                  }`}
                >
                  {TYPES_DOCUMENT[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="motif" className="text-sm text-doux">
              Motif et précisions {type === "AUTRE" ? "" : "(facultatif)"}
            </label>
            <textarea
              id="motif"
              rows={3}
              required={type === "AUTRE"}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={
                type === "AUTORISATION_ABSENCE"
                  ? "Ex. Tournage le 28 novembre de 9h à 17h, absence au cours de…"
                  : "Ex. Pour un dossier de stage, à remettre avant le…"
              }
              className="w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 py-3 focus:border-or focus:outline-none"
            />
          </div>
          <button disabled={envoi} className="flex h-12 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white disabled:opacity-60">
            {envoi && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
            Envoyer la demande
          </button>
        </form>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muet uppercase">Mes demandes</h2>
        {demandes.length === 0 && <p className="text-sm text-muet">Aucune demande pour l&apos;instant.</p>}
        {demandes.map((d) => (
          <article key={d.id} className="flex flex-col gap-2.5 rounded-2xl border border-bordure bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{TYPES_DOCUMENT[d.type_document]}</h3>
              <BadgeStatut s={d.statut} />
            </div>
            <p className="text-xs text-muet">
              Demandée le {fmtDate.format(new Date(d.date_demande))}
              {d.date_traitement ? ` · traitée le ${fmtDate.format(new Date(d.date_traitement))}` : ""}
            </p>
            {d.motif && <p className="text-sm whitespace-pre-line text-doux">{d.motif}</p>}
            {d.statut === "REFUSE" && d.commentaire_bureau && (
              <p className="rounded-xl bg-velours/10 p-3 text-sm text-alerte">Réponse du Bureau : {d.commentaire_bureau}</p>
            )}
            <div className="flex gap-2">
              {d.statut === "VALIDE" && d.fichier_genere_url && (
                <button
                  onClick={() => ouvrirPdf(d.fichier_genere_url!)}
                  className="flex h-11 items-center gap-2 rounded-full bg-or px-4 text-sm font-semibold text-encre"
                >
                  <FileDown size={16} aria-hidden /> Télécharger le PDF
                </button>
              )}
              {d.statut === "EN_ATTENTE" && (
                <button
                  onClick={() => annuler(d.id)}
                  disabled={annulation === d.id}
                  className="flex h-10 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm text-doux"
                >
                  {annulation === d.id && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
                  Annuler la demande
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TRAITEMENT : Président (validation) et Secrétariat général           */
/* ------------------------------------------------------------------ */

export function TraitementDemandes({ demandes, titre, description }: { demandes: Demande[]; titre: string; description: string }) {
  const [onglet, setOnglet] = useState<"attente" | "traitees">("attente");
  const enAttente = demandes.filter((d) => d.statut === "EN_ATTENTE").sort((a, b) => a.date_demande.localeCompare(b.date_demande));
  const traitees = demandes.filter((d) => d.statut !== "EN_ATTENTE");
  const liste = onglet === "attente" ? enAttente : traitees;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold md:text-4xl">{titre}</h1>
        <p className="text-doux">{description}</p>
      </div>

      <div role="tablist" aria-label="Demandes" className="flex w-full max-w-sm rounded-full border border-bordure bg-surface p-1">
        {(
          [
            ["attente", `En attente (${enAttente.length})`],
            ["traitees", `Traitées (${traitees.length})`],
          ] as const
        ).map(([o, label]) => (
          <button
            key={o}
            role="tab"
            aria-selected={onglet === o}
            onClick={() => setOnglet(o)}
            className={`h-10 flex-1 rounded-full text-sm font-semibold ${onglet === o ? "bg-or text-encre" : "text-doux"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {liste.length === 0 && (
        <div className="rounded-2xl border border-dashed border-bordure-2 bg-surface p-8 text-center text-muet">
          {onglet === "attente" ? "Aucune demande en attente. Tout est à jour !" : "Aucune demande traitée pour l'instant."}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {liste.map((d) => (
          <CarteDemande key={d.id} d={d} />
        ))}
      </ul>
    </div>
  );
}

function CarteDemande({ d }: { d: Demande }) {
  const router = useRouter();
  const inputPdf = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [refus, setRefus] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function choisirPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    setErreur(null);
    if (!f) return;
    if (f.type !== "application/pdf") return setErreur("Le document doit être un PDF.");
    if (f.size > TAILLE_MAX) return setErreur("Le PDF dépasse 10 Mo.");
    setPdf(f);
  }

  async function valider() {
    if (!pdf) return setErreur("Joins d'abord le PDF signé.");
    setEnvoi(true);
    setErreur(null);
    const supabase = createClient();
    const chemin = `${d.user_id}/${d.id}.pdf`; // dossier du membre : lui seul (et le Bureau) peut le lire
    const { error: errFichier } = await supabase.storage.from(BUCKET).upload(chemin, pdf, { contentType: "application/pdf", upsert: true });
    if (errFichier) {
      setEnvoi(false);
      return setErreur("Envoi du PDF impossible : " + errFichier.message);
    }
    const { error } = await supabase
      .from("demandes_administratives")
      .update({ statut: "VALIDE", fichier_genere_url: chemin, commentaire_bureau: null })
      .eq("id", d.id);
    setEnvoi(false);
    if (error) return setErreur("Validation impossible : " + error.message);
    router.refresh();
  }

  async function refuser() {
    if (!commentaire.trim()) return setErreur("Indique le motif du refus : le membre le verra.");
    setEnvoi(true);
    setErreur(null);
    const { error } = await createClient()
      .from("demandes_administratives")
      .update({ statut: "REFUSE", commentaire_bureau: commentaire.trim() })
      .eq("id", d.id);
    setEnvoi(false);
    if (error) return setErreur("Refus impossible : " + error.message);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-bordure bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold">{TYPES_DOCUMENT[d.type_document]}</h3>
          <span className="text-sm text-doux">
            {d.demandeur ? `${d.demandeur.prenom} ${d.demandeur.nom}` : "Membre"}
            {d.demandeur?.email && <span className="text-muet"> · {d.demandeur.email}</span>}
          </span>
          <span className="text-xs text-muet">
            Demandée le {fmtDate.format(new Date(d.date_demande))}
            {d.date_traitement && d.traiteur
              ? ` · traitée le ${fmtDate.format(new Date(d.date_traitement))} par ${d.traiteur.prenom} ${d.traiteur.nom}`
              : ""}
          </span>
        </div>
        <BadgeStatut s={d.statut} />
      </div>

      {d.motif && <p className="rounded-xl bg-fond-2 p-3 text-sm whitespace-pre-line text-doux">{d.motif}</p>}
      {d.statut === "REFUSE" && d.commentaire_bureau && <p className="text-sm text-alerte">Motif du refus : {d.commentaire_bureau}</p>}

      {d.statut === "VALIDE" && d.fichier_genere_url && (
        <button
          onClick={() => ouvrirPdf(d.fichier_genere_url!)}
          className="flex h-10 w-fit items-center gap-2 rounded-full border border-bordure-2 px-4 text-sm"
        >
          <FileDown size={16} aria-hidden /> Voir le PDF envoyé
        </button>
      )}

      {d.statut === "EN_ATTENTE" && !refus && (
        <div className="flex flex-col gap-3 border-t border-bordure pt-3">
          <input ref={inputPdf} type="file" accept="application/pdf" className="hidden" onChange={choisirPdf} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => inputPdf.current?.click()}
              className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${pdf ? "border-succes text-succes" : "border-bordure-2"}`}
            >
              <FileUp size={16} aria-hidden />
              {pdf ? pdf.name : "Joindre le PDF signé"}
            </button>
            <button
              onClick={valider}
              disabled={envoi || !pdf}
              className="flex h-11 items-center gap-2 rounded-full bg-[#1e5a36] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {envoi ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <CircleCheck size={16} aria-hidden />}
              Valider et envoyer
            </button>
            <button onClick={() => setRefus(true)} className="flex h-11 items-center gap-2 rounded-full px-4 text-sm text-muet hover:text-alerte">
              <CircleX size={16} aria-hidden /> Refuser
            </button>
          </div>
        </div>
      )}

      {d.statut === "EN_ATTENTE" && refus && (
        <div className="flex flex-col gap-2 border-t border-bordure pt-3">
          <label htmlFor={`refus-${d.id}`} className="text-sm text-doux">
            Motif du refus (visible par le membre)
          </label>
          <textarea
            id={`refus-${d.id}`}
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 py-3 focus:border-or focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setRefus(false)} className="h-10 rounded-full px-4 text-sm text-doux">
              Annuler
            </button>
            <button
              onClick={refuser}
              disabled={envoi}
              className="flex h-10 items-center gap-2 rounded-full bg-velours px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {envoi && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
              Confirmer le refus
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
          {erreur}
        </p>
      )}
    </li>
  );
}
