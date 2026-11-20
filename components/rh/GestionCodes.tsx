"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LoaderCircle, MessageCircle, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/config";
import { dateCourte } from "@/lib/format";
import type { CodeInvitation } from "@/lib/types";

type Filtre = "dispo" | "utilises" | "tous";

function statut(c: CodeInvitation): "dispo" | "utilise" | "expire" {
  if (c.est_utilise) return "utilise";
  if (c.expire_le && new Date(c.expire_le) < new Date()) return "expire";
  return "dispo";
}

function messageInvitation(code: string) {
  return `Bienvenue aux Universcènes ! 🎭\n1. Ouvre ${SITE_URL} sur ton téléphone et installe l'app\n2. Choisis « Inscription »\n3. Ton code d'invitation : ${code}`;
}

export function GestionCodes({ codes, noms }: { codes: CodeInvitation[]; noms: Record<string, string> }) {
  const router = useRouter();
  const supabase = createClient();
  const [nombre, setNombre] = useState(5);
  const [validite, setValidite] = useState(30);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("dispo");

  async function generer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    const { error } = await supabase.rpc("generer_codes_invitation", { p_nombre: nombre, p_validite_jours: validite });
    setChargement(false);
    if (error) return setErreur("Génération impossible : " + error.message);
    setFiltre("dispo");
    router.refresh();
  }

  async function copier(code: string) {
    await navigator.clipboard.writeText(messageInvitation(code));
    setCopie(code);
    setTimeout(() => setCopie(null), 1800);
  }

  async function supprimer(id: string) {
    await supabase.from("club_codes").delete().eq("id", id);
    router.refresh();
  }

  const visibles = codes.filter((c) =>
    filtre === "tous" ? true : filtre === "utilises" ? c.est_utilise : statut(c) === "dispo"
  );
  const nbDispo = codes.filter((c) => statut(c) === "dispo").length;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={generer} className="flex flex-wrap items-end gap-3 rounded-2xl border border-bordure bg-surface p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre" className="text-sm text-doux">Nombre de codes</label>
          <input
            id="nombre"
            type="number"
            min={1}
            max={50}
            value={nombre}
            onChange={(e) => setNombre(Number(e.target.value))}
            className="h-12 w-28 rounded-xl border border-bordure-2 bg-fond-2 px-3.5"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="validite" className="text-sm text-doux">Valables pendant</label>
          <select
            id="validite"
            value={validite}
            onChange={(e) => setValidite(Number(e.target.value))}
            className="h-12 rounded-xl border border-bordure-2 bg-fond-2 px-3.5"
          >
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>3 mois</option>
          </select>
        </div>
        <button
          disabled={chargement}
          className="flex h-12 items-center gap-2 rounded-full bg-velours px-5 font-semibold text-white disabled:opacity-60"
        >
          {chargement ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Plus size={18} aria-hidden />}
          Générer
        </button>
        {erreur && <p className="w-full text-sm text-alerte">{erreur}</p>}
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les codes">
        {(
          [
            ["dispo", `Disponibles (${nbDispo})`],
            ["utilises", "Utilisés"],
            ["tous", "Tous"],
          ] as const
        ).map(([f, l]) => (
          <button
            key={f}
            aria-pressed={filtre === f}
            onClick={() => setFiltre(f)}
            className={`h-10 rounded-full border px-4 text-sm font-medium ${
              filtre === f ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {visibles.length === 0 && <li className="text-sm text-muet">Aucun code ici.</li>}
        {visibles.map((c) => {
          const s = statut(c);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-bordure bg-surface p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`font-mono text-lg tracking-wide ${s === "dispo" ? "" : "text-muet line-through"}`}>{c.code}</span>
                <span className="text-xs text-muet">
                  {s === "utilise"
                    ? `Utilisé par ${noms[c.utilise_par_user_id ?? ""] ?? "un membre"}${c.utilise_le ? " le " + dateCourte(c.utilise_le) : ""}`
                    : s === "expire"
                      ? "Expiré"
                      : c.expire_le
                        ? `Valable jusqu'au ${dateCourte(c.expire_le)}`
                        : "Sans expiration"}
                </span>
              </div>
              {s === "dispo" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => copier(c.code)}
                    className="flex h-11 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm"
                  >
                    {copie === c.code ? <Check size={16} className="text-succes" aria-hidden /> : <Copy size={16} aria-hidden />}
                    {copie === c.code ? "Copié" : "Copier"}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(messageInvitation(c.code))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm text-texte"
                  >
                    <MessageCircle size={16} aria-hidden /> WhatsApp
                  </a>
                  <button
                    onClick={() => supprimer(c.id)}
                    aria-label={`Supprimer le code ${c.code}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muet hover:text-alerte"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
