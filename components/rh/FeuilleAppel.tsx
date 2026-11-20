"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, Download, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/nav/Avatar";

export type Statut = "PRESENT" | "ABSENT" | "RETARD" | "JUSTIFIE";

export interface EvtAppel {
  id: string;
  titre: string;
  type: string;
  date_debut: string;
  lieu: string | null;
}

export interface PersonneAppel {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  poste: string | null;
  avatar_url: string | null;
}

const STATUTS: { cle: Statut; court: string; label: string; actif: string }[] = [
  { cle: "PRESENT", court: "P", label: "Présent", actif: "border-[#2e7a4c] bg-[#1e5a36] text-[#e6f6ec]" },
  { cle: "ABSENT", court: "A", label: "Absent", actif: "border-[#9a2d24] bg-[#7a1f18] text-[#fbe9e7]" },
  { cle: "RETARD", court: "R", label: "Retard", actif: "border-[#9a7520] bg-[#7a5a14] text-[#fff4d9]" },
  { cle: "JUSTIFIE", court: "J", label: "Justifié", actif: "border-[#2d5c92] bg-[#1e4470] text-[#e3eefa]" },
];

const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Casablanca",
});

export function FeuilleAppel({
  evenements,
  evenement,
  personnes,
  presencesInitiales,
  nbEnAttente,
}: {
  evenements: EvtAppel[];
  evenement: EvtAppel | null;
  personnes: PersonneAppel[];
  presencesInitiales: Record<string, Statut>;
  nbEnAttente: number;
}) {
  const router = useRouter();
  const [presences, setPresences] = useState<Record<string, Statut>>(presencesInitiales);
  const [enCours, setEnCours] = useState<Record<string, boolean>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [toutEnCours, setToutEnCours] = useState(false);

  const r = recherche.trim().toLowerCase();
  const visibles = useMemo(
    () => personnes.filter((p) => !r || `${p.prenom} ${p.nom} ${p.email}`.toLowerCase().includes(r)),
    [personnes, r]
  );

  const compte = (s: Statut) => Object.values(presences).filter((v) => v === s).length;
  const nonNotes = personnes.length - Object.keys(presences).length;

  /** Un clic = enregistré tout de suite. Re-cliquer sur le même statut l'efface. */
  async function marquer(personne: PersonneAppel, statut: Statut) {
    if (!evenement) return;
    const avant = presences[personne.id];
    const efface = avant === statut;
    setErreur(null);
    setPresences((p) => {
      const n = { ...p };
      if (efface) delete n[personne.id];
      else n[personne.id] = statut;
      return n;
    });
    setEnCours((e) => ({ ...e, [personne.id]: true }));

    const supabase = createClient();
    const { error } = efface
      ? await supabase.from("presences").delete().eq("evenement_id", evenement.id).eq("user_id", personne.id)
      : await supabase
          .from("presences")
          .upsert({ evenement_id: evenement.id, user_id: personne.id, statut }, { onConflict: "evenement_id,user_id" });

    setEnCours((e) => ({ ...e, [personne.id]: false }));
    if (error) {
      // retour à l'état précédent
      setPresences((p) => {
        const n = { ...p };
        if (avant) n[personne.id] = avant;
        else delete n[personne.id];
        return n;
      });
      setErreur(`Impossible d'enregistrer pour ${personne.prenom} ${personne.nom} : ${error.message}`);
    }
  }

  /** Marque « Présent » tous ceux qui ne sont pas encore notés. */
  async function tousPresents() {
    if (!evenement) return;
    const cibles = personnes.filter((p) => !presences[p.id]);
    if (cibles.length === 0) return;
    setToutEnCours(true);
    setErreur(null);
    const { error } = await createClient()
      .from("presences")
      .upsert(
        cibles.map((p) => ({ evenement_id: evenement.id, user_id: p.id, statut: "PRESENT" as Statut })),
        { onConflict: "evenement_id,user_id" }
      );
    setToutEnCours(false);
    if (error) return setErreur("Impossible d'enregistrer : " + error.message);
    setPresences((p) => {
      const n = { ...p };
      cibles.forEach((c) => (n[c.id] = "PRESENT"));
      return n;
    });
  }

  function exporterCsv() {
    if (!evenement) return;
    const libelle = (s?: Statut) => STATUTS.find((x) => x.cle === s)?.label ?? "Non noté";
    const echapper = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lignes = [
      ["Nom", "Prénom", "Email", "Poste", "Statut"].map(echapper).join(";"),
      ...personnes.map((p) =>
        [p.nom, p.prenom, p.email, p.poste ?? "Membre", libelle(presences[p.id])].map(echapper).join(";")
      ),
    ];
    // BOM UTF-8 pour qu'Excel affiche correctement les accents
    const blob = new Blob([String.fromCharCode(0xfeff) + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appel-${evenement.date_debut.slice(0, 10)}-${evenement.titre.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-bold">Feuille d&apos;appel</h1>

      {evenements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bordure-2 bg-surface p-8 text-center text-muet">
          Aucun événement récent. Le Président crée les événements dans le{" "}
          <Link href="/espace/planning" className="text-or underline">
            Planning
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="evt" className="text-sm text-doux">
              Événement
            </label>
            <select
              id="evt"
              value={evenement?.id ?? ""}
              onChange={(e) => router.push(`/espace/rh/appel?evt=${e.target.value}`)}
              className="h-12 rounded-xl border border-bordure-2 bg-surface px-3.5 focus:border-or focus:outline-none"
            >
              {evenements.map((e) => (
                <option key={e.id} value={e.id}>
                  {fmtDate.format(new Date(e.date_debut))} · {e.titre}
                </option>
              ))}
            </select>
          </div>

          {evenement && (
            <>
              <div className="grid grid-cols-5 gap-2">
                <Compteur valeur={compte("PRESENT")} label="Présents" classe="text-succes" />
                <Compteur valeur={compte("ABSENT")} label="Absents" classe="text-alerte" />
                <Compteur valeur={compte("RETARD")} label="Retards" classe="text-or-clair" />
                <Compteur valeur={compte("JUSTIFIE")} label="Justifiés" classe="text-[#8cb8e8]" />
                <Compteur valeur={nonNotes} label="Non notés" classe="text-muet" />
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="flex h-11 min-w-[200px] flex-1 items-center gap-2 rounded-full border border-bordure-2 bg-surface px-4">
                  <Search size={16} className="text-muet" aria-hidden />
                  <span className="sr-only">Rechercher</span>
                  <input
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher un membre…"
                    className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <button
                  onClick={tousPresents}
                  disabled={toutEnCours || nonNotes === 0}
                  className="flex h-11 items-center gap-2 rounded-full border border-bordure-2 px-4 text-sm font-medium disabled:opacity-50"
                >
                  <CheckCheck size={16} aria-hidden /> Non notés → Présents
                </button>
                <button
                  onClick={exporterCsv}
                  className="flex h-11 items-center gap-2 rounded-full border border-bordure-2 px-4 text-sm font-medium"
                >
                  <Download size={16} aria-hidden /> Export CSV
                </button>
              </div>

              {erreur && (
                <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
                  {erreur}
                </p>
              )}

              <p className="text-xs text-muet">
                Un clic enregistre tout de suite. Re-clique sur le même statut pour l&apos;effacer.
              </p>

              <ul className="flex flex-col divide-y divide-bordure rounded-2xl border border-bordure bg-surface">
                {visibles.map((p) => (
                  <li key={p.id} className={`flex items-center gap-3 px-3 py-2.5 md:px-4 ${enCours[p.id] ? "opacity-60" : ""}`}>
                    <Avatar prenom={p.prenom} nom={p.nom} chemin={p.avatar_url} taille={38} bordure={false} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium md:text-base">
                        {p.prenom} {p.nom}
                      </span>
                      {p.role !== "MEMBRE" && <span className="truncate text-xs text-or-clair">{p.poste ?? "Bureau"}</span>}
                    </div>
                    <div className="flex gap-1" role="group" aria-label={`Présence de ${p.prenom} ${p.nom}`}>
                      {STATUTS.map((s) => {
                        const actif = presences[p.id] === s.cle;
                        return (
                          <button
                            key={s.cle}
                            onClick={() => marquer(p, s.cle)}
                            aria-pressed={actif}
                            aria-label={`${s.label} : ${p.prenom} ${p.nom}`}
                            title={s.label}
                            className={`h-11 w-9 rounded-lg border text-sm font-semibold md:w-11 ${
                              actif ? s.actif : "border-bordure text-muet hover:border-bordure-2"
                            }`}
                          >
                            {s.court}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
                {visibles.length === 0 && <li className="p-6 text-center text-sm text-muet">Aucun membre trouvé.</li>}
              </ul>

              {nbEnAttente > 0 && (
                <p className="text-sm text-muet">
                  {nbEnAttente} membre{nbEnAttente > 1 ? "s" : ""} accepté{nbEnAttente > 1 ? "s" : ""} n&apos;
                  {nbEnAttente > 1 ? "ont" : "a"} pas encore créé de compte et n&apos;apparai{nbEnAttente > 1 ? "ssent" : "t"} pas
                  ici.{" "}
                  <Link href="/espace/rh/membres" className="text-or underline">
                    Voir la liste
                  </Link>
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Compteur({ valeur, label, classe }: { valeur: number; label: string; classe: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-bordure bg-surface px-1 py-2.5 text-center">
      <span className={`text-xl font-semibold tabular-nums ${classe}`}>{valeur}</span>
      <span className="text-[10px] text-muet md:text-xs">{label}</span>
    </div>
  );
}
