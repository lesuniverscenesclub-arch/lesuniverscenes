"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Search, ShieldAlert, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/nav/Avatar";
import { LIBELLES_POLES, LIBELLES_ROLES } from "@/lib/roles";
import type { Pole, Profil, Role } from "@/lib/types";

const ROLES = Object.keys(LIBELLES_ROLES) as Role[];
const POLES = Object.keys(LIBELLES_POLES) as Pole[];
const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Casablanca" });

type Filtre = "TOUS" | "BUREAU" | "MEMBRES";

export function GestionRoles({ utilisateurs, monId }: { utilisateurs: Profil[]; monId: string }) {
  const [filtre, setFiltre] = useState<Filtre>("TOUS");
  const [recherche, setRecherche] = useState("");
  const r = recherche.trim().toLowerCase();

  const visibles = useMemo(
    () =>
      utilisateurs
        .filter((u) => (filtre === "TOUS" ? true : filtre === "BUREAU" ? u.role !== "MEMBRE" : u.role === "MEMBRE"))
        .filter((u) => !r || `${u.prenom} ${u.nom} ${u.email} ${u.poste ?? ""}`.toLowerCase().includes(r)),
    [utilisateurs, filtre, r]
  );
  const nb = (f: Filtre) =>
    utilisateurs.filter((u) => (f === "TOUS" ? true : f === "BUREAU" ? u.role !== "MEMBRE" : u.role === "MEMBRE")).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Membres & rôles</h1>
        <p className="text-doux">Change le rôle, le poste ou le pôle d&apos;une personne. Le rôle décide de ce qu&apos;elle voit dans l&apos;app.</p>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-or/40 bg-[#2a2213] p-3 text-sm text-or-clair">
        <ShieldAlert size={18} className="mt-0.5 flex-none" aria-hidden />
        Un rôle du Bureau donne accès à des données privées (présences, demandes, documents internes). Ne le donne qu&apos;aux membres élus.
      </p>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Filtrer">
        {(
          [
            ["TOUS", "Tous"],
            ["BUREAU", "Bureau"],
            ["MEMBRES", "Membres"],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            aria-pressed={filtre === f}
            onClick={() => setFiltre(f)}
            className={`h-10 flex-none rounded-full border px-4 text-sm font-medium ${filtre === f ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"}`}
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
          placeholder="Rechercher un nom, un email, un poste…"
          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
      </label>

      <ul className="flex flex-col gap-2.5">
        {visibles.map((u) => (
          <LigneUtilisateur key={u.id} u={u} moi={u.id === monId} />
        ))}
        {visibles.length === 0 && (
          <li className="rounded-2xl border border-dashed border-bordure-2 bg-surface p-8 text-center text-muet">Personne trouvée.</li>
        )}
      </ul>
    </div>
  );
}

const champ = "h-11 w-full rounded-xl border border-bordure-2 bg-fond-2 px-3 text-sm focus:border-or focus:outline-none disabled:opacity-50";

function LigneUtilisateur({ u, moi }: { u: Profil; moi: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(u.role);
  const [poste, setPoste] = useState(u.poste ?? "");
  const [pole, setPole] = useState<Pole | "">(u.pole ?? "");
  const [ordre, setOrdre] = useState(u.ordre_bureau?.toString() ?? "");
  const [etat, setEtat] = useState<"repos" | "envoi" | "ok">("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);

  const modifie =
    role !== u.role || poste.trim() !== (u.poste ?? "") || pole !== (u.pole ?? "") || ordre !== (u.ordre_bureau?.toString() ?? "");

  async function enregistrer() {
    setEtat("envoi");
    setErreur(null);
    const ordreNum = ordre.trim() === "" ? null : Number(ordre);
    const { error } = await createClient()
      .from("users")
      .update({
        role,
        poste: poste.trim() || null,
        pole: pole || null,
        ordre_bureau: ordreNum !== null && Number.isFinite(ordreNum) ? Math.round(ordreNum) : null,
      })
      .eq("id", u.id);
    if (error) {
      setEtat("repos");
      return setErreur(error.message);
    }
    setEtat("ok");
    router.refresh();
    setTimeout(() => setEtat("repos"), 2000);
  }

  async function retirer() {
    setEtat("envoi");
    const { error } = await createClient().from("users").delete().eq("id", u.id);
    if (error) {
      setEtat("repos");
      setConfirmer(false);
      return setErreur(error.message);
    }
    router.refresh();
  }

  return (
    <li className={`flex flex-col gap-3 rounded-2xl border bg-surface p-4 ${modifie ? "border-or/60" : "border-bordure"}`}>
      <div className="flex items-center gap-3">
        <Avatar prenom={u.prenom} nom={u.nom} chemin={u.avatar_url} taille={42} bordure={u.role !== "MEMBRE"} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">
            {u.prenom} {u.nom} {moi && <span className="text-xs font-normal text-muet">(toi)</span>}
          </span>
          <span className="truncate text-xs text-muet">
            {u.email} · inscrit le {fmtDate.format(new Date(u.date_inscription))}
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.4fr_1fr_0.6fr]">
        <label className="flex flex-col gap-1 text-xs text-muet">
          Rôle
          <select value={role} disabled={moi} onChange={(e) => setRole(e.target.value as Role)} className={champ}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {LIBELLES_ROLES[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muet">
          Poste affiché
          <input value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Vice-trésorière" className={champ} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muet">
          Pôle
          <select value={pole} onChange={(e) => setPole(e.target.value as Pole | "")} className={champ}>
            <option value="">—</option>
            {POLES.map((p) => (
              <option key={p} value={p}>
                {LIBELLES_POLES[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muet">
          Ordre
          <input value={ordre} onChange={(e) => setOrdre(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="—" className={champ} />
        </label>
      </div>

      {erreur && <p role="alert" className="rounded-xl bg-velours/10 p-2.5 text-sm text-alerte">{erreur}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={enregistrer}
          disabled={!modifie || etat === "envoi"}
          className="flex h-10 items-center gap-1.5 rounded-full bg-velours px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {etat === "envoi" ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : etat === "ok" ? <Check size={15} aria-hidden /> : null}
          {etat === "ok" ? "Enregistré" : "Enregistrer"}
        </button>
        {modifie && (
          <button
            onClick={() => {
              setRole(u.role);
              setPoste(u.poste ?? "");
              setPole(u.pole ?? "");
              setOrdre(u.ordre_bureau?.toString() ?? "");
            }}
            className="h-10 rounded-full px-3 text-sm text-doux"
          >
            Annuler
          </button>
        )}
        {!moi && u.role !== "ADMIN" && !confirmer && (
          <button onClick={() => setConfirmer(true)} className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muet hover:text-alerte">
            <Trash2 size={15} aria-hidden /> Retirer du club
          </button>
        )}
        {confirmer && (
          <span className="ml-auto flex flex-wrap items-center gap-2 rounded-xl border border-velours-clair/40 bg-velours/10 p-2">
            <span className="text-sm text-alerte">Supprimer son profil, ses présences et ses messages ?</span>
            <button onClick={() => setConfirmer(false)} className="h-9 rounded-full px-3 text-sm text-doux">
              Annuler
            </button>
            <button onClick={retirer} className="h-9 rounded-full bg-velours px-3.5 text-sm font-semibold text-white">
              Supprimer
            </button>
          </span>
        )}
      </div>
    </li>
  );
}
