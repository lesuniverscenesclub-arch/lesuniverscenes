"use client";

import { useMemo, useState } from "react";
import { Check, Copy, MessageCircle, Search } from "lucide-react";
import { SITE_URL } from "@/lib/config";

export interface Preinscrit {
  email: string;
  email_2: string | null;
  nom_complet: string;
  telephone: string | null;
  etablissement: string | null;
  filiere: string | null;
  interets: string | null;
  competences: string | null;
  inscrit_le: string | null;
}

export interface Inscrit {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  poste: string | null;
  date_inscription: string;
}

/** 06 12 34 56 78 -> 212612345678 (format WhatsApp) */
function numeroWhatsApp(tel: string | null): string | null {
  if (!tel) return null;
  let n = tel.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "212" + n.slice(1);
  return n.length >= 11 ? n : null;
}

function messageInvitation(p: Preinscrit) {
  return [
    `Bonjour ${p.nom_complet} ! Bienvenue aux Universcènes 🎭`,
    `Ta candidature est acceptée. Pour rejoindre l'app du club :`,
    `1. Ouvre ${SITE_URL} sur ton téléphone et installe l'app`,
    `2. Choisis « Inscription » avec l'email ${p.email}${p.email_2 ? ` (ou ${p.email_2})` : ""}`,
    `3. Laisse le code d'invitation vide : ton email suffit.`,
  ].join("\n");
}

export function ListeMembres({ preinscrits, inscrits }: { preinscrits: Preinscrit[]; inscrits: Inscrit[] }) {
  const [onglet, setOnglet] = useState<"attente" | "inscrits">("attente");
  const [recherche, setRecherche] = useState("");
  const [copie, setCopie] = useState<string | null>(null);

  const enAttente = preinscrits.filter((p) => !p.inscrit_le);
  const r = recherche.trim().toLowerCase();

  const attenteVisibles = useMemo(
    () =>
      enAttente.filter(
        (p) => !r || `${p.nom_complet} ${p.email} ${p.email_2 ?? ""} ${p.etablissement ?? ""}`.toLowerCase().includes(r)
      ),
    [enAttente, r]
  );
  const inscritsVisibles = useMemo(
    () => inscrits.filter((u) => !r || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(r)),
    [inscrits, r]
  );

  async function copier(cle: string, texte: string) {
    await navigator.clipboard.writeText(texte);
    setCopie(cle);
    setTimeout(() => setCopie(null), 1800);
  }

  const messageGroupe = [
    "Bienvenue aux nouveaux membres des Universcènes 🎭",
    `Installez l'app du club : ${SITE_URL}`,
    "Choisissez « Inscription » avec l'email donné dans le formulaire de candidature, sans code d'invitation.",
  ].join("\n");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat valeur={inscrits.length} label="Comptes créés" />
        <Stat valeur={enAttente.length} label="Acceptés, pas encore inscrits" or />
        <Stat valeur={preinscrits.length - enAttente.length} label="Candidats inscrits" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-or/50 bg-surface p-4">
        <p className="text-sm text-doux">Message à envoyer dans le groupe WhatsApp des nouveaux membres :</p>
        <button
          onClick={() => copier("groupe", messageGroupe)}
          className="flex h-11 items-center gap-2 rounded-full bg-or px-4 text-sm font-semibold text-encre"
        >
          {copie === "groupe" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copie === "groupe" ? "Copié" : "Copier le message"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Liste" className="flex rounded-full border border-bordure bg-surface p-1">
          {(
            [
              ["attente", `En attente (${enAttente.length})`],
              ["inscrits", `Inscrits (${inscrits.length})`],
            ] as const
          ).map(([o, label]) => (
            <button
              key={o}
              role="tab"
              aria-selected={onglet === o}
              onClick={() => setOnglet(o)}
              className={`h-10 rounded-full px-4 text-sm font-semibold ${onglet === o ? "bg-or text-encre" : "text-doux"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-bordure-2 bg-surface px-4">
          <Search size={16} className="text-muet" aria-hidden />
          <span className="sr-only">Rechercher</span>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un email…"
            className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </label>
      </div>

      {onglet === "attente" ? (
        <ul className="flex flex-col gap-2.5">
          {attenteVisibles.length === 0 && (
            <li className="rounded-2xl border border-dashed border-bordure-2 p-6 text-center text-muet">
              {enAttente.length === 0 ? "Tous les candidats acceptés ont créé leur compte." : "Aucun résultat."}
            </li>
          )}
          {attenteVisibles.map((p) => {
            const wa = numeroWhatsApp(p.telephone);
            return (
              <li key={p.email} className="flex flex-wrap items-center gap-3 rounded-2xl border border-bordure bg-surface p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{p.nom_complet}</span>
                  <span className="truncate text-sm text-muet">
                    {[p.etablissement, p.filiere].filter(Boolean).join(" · ")}
                  </span>
                  <span className="truncate text-xs text-muet">
                    {p.email}
                    {p.email_2 ? ` · ${p.email_2}` : ""}
                    {p.telephone ? ` · ${p.telephone}` : ""}
                  </span>
                  {(p.interets || p.competences) && (
                    <span className="truncate text-xs text-or-clair">
                      {[p.interets, p.competences].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copier(p.email, messageInvitation(p))}
                    className="flex h-11 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm"
                  >
                    {copie === p.email ? <Check size={16} className="text-succes" aria-hidden /> : <Copy size={16} aria-hidden />}
                    {copie === p.email ? "Copié" : "Message"}
                  </button>
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}?text=${encodeURIComponent(messageInvitation(p))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 items-center gap-1.5 rounded-full bg-[#1e5a36] px-3.5 text-sm font-semibold text-white"
                    >
                      <MessageCircle size={16} aria-hidden /> WhatsApp
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {inscritsVisibles.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-bordure bg-surface p-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
                  {u.prenom} {u.nom}
                </span>
                <span className="truncate text-sm text-muet">{u.email}</span>
              </div>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  u.role === "MEMBRE" ? "bg-surface-2 text-doux" : "bg-[#2a2213] text-or-clair"
                }`}
              >
                {u.poste ?? (u.role === "MEMBRE" ? "Membre" : u.role)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ valeur, label, or }: { valeur: number; label: string; or?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-bordure bg-surface p-4">
      <span className={`text-2xl font-semibold tabular-nums md:text-3xl ${or ? "text-or" : ""}`}>{valeur}</span>
      <span className="text-xs text-muet md:text-sm">{label}</span>
    </div>
  );
}
