"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { LIBELLES_EVENEMENT } from "@/lib/format";

type TypeEvt = keyof typeof LIBELLES_EVENEMENT;
type Statut = "PRESENT" | "ABSENT" | "RETARD" | "JUSTIFIE";

export interface EvtExport {
  id: string;
  titre: string;
  type: TypeEvt;
  date_debut: string;
}
export interface PersonneExport {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  poste: string | null;
  role: string;
}
export interface PresenceExport {
  evenement_id: string;
  user_id: string;
  statut: Statut;
  remarque: string | null;
}

const LIBELLES_STATUT: Record<Statut, string> = { PRESENT: "Présent", RETARD: "Retard", JUSTIFIE: "Justifié", ABSENT: "Absent" };
const FUSEAU = "Africa/Casablanca";
const jour = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: FUSEAU });
const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: FUSEAU });

function telechargerCsv(nom: string, lignes: (string | number)[][]) {
  const echapper = (v: string | number) => {
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM + séparateur ";" : s'ouvre directement avec les accents dans Excel (réglages français)
  const contenu = String.fromCharCode(0xfeff) + lignes.map((l) => l.map(echapper).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportsPresences({
  evenements,
  personnes,
  presences,
}: {
  evenements: EvtExport[];
  personnes: PersonneExport[];
  presences: PresenceExport[];
}) {
  const aujourdHui = jour(new Date().toISOString());
  const [debut, setDebut] = useState(jour(new Date(Date.now() - 90 * 864e5).toISOString()));
  const [fin, setFin] = useState(aujourdHui);
  const [types, setTypes] = useState<Set<TypeEvt>>(new Set(Object.keys(LIBELLES_EVENEMENT) as TypeEvt[]));
  const [recherche, setRecherche] = useState("");

  const evts = useMemo(
    () => evenements.filter((e) => jour(e.date_debut) >= debut && jour(e.date_debut) <= fin && types.has(e.type)),
    [evenements, debut, fin, types]
  );

  // Récap par personne sur les événements filtrés
  const recap = useMemo(() => {
    const ids = new Set(evts.map((e) => e.id));
    const parPersonne = new Map<string, Record<Statut, number>>();
    for (const p of presences) {
      if (!ids.has(p.evenement_id)) continue;
      const c = parPersonne.get(p.user_id) ?? { PRESENT: 0, RETARD: 0, JUSTIFIE: 0, ABSENT: 0 };
      c[p.statut]++;
      parPersonne.set(p.user_id, c);
    }
    return personnes
      .map((pers) => {
        const c = parPersonne.get(pers.id) ?? { PRESENT: 0, RETARD: 0, JUSTIFIE: 0, ABSENT: 0 };
        const marques = c.PRESENT + c.RETARD + c.JUSTIFIE + c.ABSENT;
        const taux = marques ? Math.round(((c.PRESENT + c.RETARD) / marques) * 100) : null;
        return { pers, ...c, marques, taux };
      })
      .sort((a, b) => (a.taux ?? 101) - (b.taux ?? 101) || a.pers.prenom.localeCompare(b.pers.prenom));
  }, [evts, presences, personnes]);

  const r = recherche.trim().toLowerCase();
  const visibles = recap.filter((x) => !r || `${x.pers.prenom} ${x.pers.nom} ${x.pers.email}`.toLowerCase().includes(r));
  const suffixe = `${debut}_${fin}`;

  function exporterRecap() {
    telechargerCsv(`presences-recap_${suffixe}.csv`, [
      ["Prénom", "Nom", "Email", "Poste", "Présent", "Retard", "Justifié", "Absent", "Appels", "Taux de présence (%)"],
      ...recap.map((x) => [
        x.pers.prenom,
        x.pers.nom,
        x.pers.email,
        x.pers.poste ?? (x.pers.role === "MEMBRE" ? "Membre" : ""),
        x.PRESENT,
        x.RETARD,
        x.JUSTIFIE,
        x.ABSENT,
        x.marques,
        x.taux ?? "",
      ]),
    ]);
  }

  function exporterDetail() {
    const evtsParId = new Map<string, EvtExport>(evts.map((e) => [e.id, e]));
    const persParId = new Map<string, PersonneExport>(personnes.map((p) => [p.id, p]));
    const lignes = presences
      .filter((p) => evtsParId.has(p.evenement_id) && persParId.has(p.user_id))
      .map((p) => ({ p, e: evtsParId.get(p.evenement_id)!, u: persParId.get(p.user_id)! }))
      .sort((a, b) => a.e.date_debut.localeCompare(b.e.date_debut) || a.u.prenom.localeCompare(b.u.prenom));
    telechargerCsv(`presences-detail_${suffixe}.csv`, [
      ["Date", "Événement", "Type", "Prénom", "Nom", "Email", "Statut", "Remarque"],
      ...lignes.map(({ p, e, u }) => [
        fmtDate.format(new Date(e.date_debut)),
        e.titre,
        LIBELLES_EVENEMENT[e.type],
        u.prenom,
        u.nom,
        u.email,
        LIBELLES_STATUT[p.statut],
        p.remarque ?? "",
      ]),
    ]);
  }

  function exporterGrille() {
    const parCle = new Map<string, Statut>(presences.map((p) => [`${p.evenement_id}|${p.user_id}`, p.statut]));
    const ordre = [...evts].sort((a, b) => a.date_debut.localeCompare(b.date_debut));
    telechargerCsv(`presences-grille_${suffixe}.csv`, [
      ["Prénom", "Nom", ...ordre.map((e) => `${fmtDate.format(new Date(e.date_debut))} ${e.titre}`)],
      ...[...personnes]
        .sort((a, b) => a.prenom.localeCompare(b.prenom))
        .map((u) => [u.prenom, u.nom, ...ordre.map((e) => {
          const s = parCle.get(`${e.id}|${u.id}`);
          return s ? LIBELLES_STATUT[s] : "";
        })]),
    ]);
  }

  const champ = "h-11 rounded-xl border border-bordure-2 bg-fond-2 px-3 focus:border-or focus:outline-none";
  const totalAppels = recap.reduce((s, x) => s + x.marques, 0);
  const tauxGlobal = totalAppels
    ? Math.round((recap.reduce((s, x) => s + x.PRESENT + x.RETARD, 0) / totalAppels) * 100)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Exports présences</h1>
        <p className="text-doux">Choisis une période, vérifie le récap, puis télécharge le fichier (s&apos;ouvre dans Excel ou Google Sheets).</p>
      </div>

      {/* Filtres */}
      <section className="flex flex-col gap-4 rounded-2xl border border-bordure bg-surface p-4 md:p-5">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-doux">
            Du
            <input type="date" value={debut} max={fin} onChange={(e) => setDebut(e.target.value)} className={champ} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-doux">
            Au
            <input type="date" value={fin} min={debut} onChange={(e) => setFin(e.target.value)} className={champ} />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            {(
              [
                ["Ce mois-ci", 0],
                ["3 mois", 90],
                ["Toute l'année", 365],
              ] as const
            ).map(([label, jours]) => (
              <button
                key={label}
                onClick={() => {
                  const d = new Date();
                  setDebut(jours === 0 ? `${aujourdHui.slice(0, 8)}01` : jour(new Date(d.getTime() - jours * 864e5).toISOString()));
                  setFin(aujourdHui);
                }}
                className="h-11 rounded-full border border-bordure-2 px-4 text-sm text-doux"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Types d'événement">
          {(Object.keys(LIBELLES_EVENEMENT) as TypeEvt[]).map((t) => (
            <button
              key={t}
              aria-pressed={types.has(t)}
              onClick={() =>
                setTypes((s) => {
                  const n = new Set(s);
                  if (n.has(t)) n.delete(t);
                  else n.add(t);
                  return n;
                })
              }
              className={`h-10 rounded-full border px-4 text-sm font-medium ${types.has(t) ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"}`}
            >
              {LIBELLES_EVENEMENT[t]}
            </button>
          ))}
        </div>
      </section>

      {/* Chiffres + exports */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-bordure bg-surface p-4">
          <p className="text-xs text-muet">Événements</p>
          <p className="font-display text-3xl font-bold">{evts.length}</p>
        </div>
        <div className="rounded-2xl border border-bordure bg-surface p-4">
          <p className="text-xs text-muet">Appels enregistrés</p>
          <p className="font-display text-3xl font-bold">{totalAppels}</p>
        </div>
        <div className="rounded-2xl border border-bordure bg-surface p-4">
          <p className="text-xs text-muet">Taux de présence</p>
          <p className="font-display text-3xl font-bold">{tauxGlobal === null ? "—" : `${tauxGlobal} %`}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={exporterRecap}
          disabled={!evts.length}
          className="flex h-11 items-center gap-2 rounded-full bg-velours px-5 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Download size={16} aria-hidden /> Récap par membre
        </button>
        <button
          onClick={exporterGrille}
          disabled={!evts.length}
          className="flex h-11 items-center gap-2 rounded-full border border-or px-5 text-sm font-semibold text-or disabled:opacity-40"
        >
          <Download size={16} aria-hidden /> Grille membres × séances
        </button>
        <button
          onClick={exporterDetail}
          disabled={!evts.length}
          className="flex h-11 items-center gap-2 rounded-full border border-bordure-2 px-5 text-sm disabled:opacity-40"
        >
          <Download size={16} aria-hidden /> Détail ligne par ligne
        </button>
      </div>

      {/* Aperçu */}
      <section className="flex flex-col gap-3">
        <label className="flex h-11 items-center gap-2 rounded-full border border-bordure-2 bg-surface px-4">
          <Search size={16} className="text-muet" aria-hidden />
          <span className="sr-only">Rechercher</span>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un membre…"
            className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </label>
        <div className="overflow-x-auto rounded-2xl border border-bordure bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-bordure text-left text-xs text-muet">
                <th className="px-4 py-3 font-medium">Membre</th>
                <th className="px-2 py-3 text-right font-medium">Présent</th>
                <th className="px-2 py-3 text-right font-medium">Retard</th>
                <th className="px-2 py-3 text-right font-medium">Justifié</th>
                <th className="px-2 py-3 text-right font-medium">Absent</th>
                <th className="px-4 py-3 text-right font-medium">Taux</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((x) => (
                <tr key={x.pers.id} className="border-b border-bordure last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">
                      {x.pers.prenom} {x.pers.nom}
                    </span>
                    {x.pers.poste && <span className="ml-2 text-xs text-or-clair">{x.pers.poste}</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{x.PRESENT}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{x.RETARD}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{x.JUSTIFIE}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{x.ABSENT}</td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                      x.taux === null ? "text-muet" : x.taux < 50 ? "text-alerte" : x.taux < 75 ? "text-or-clair" : "text-succes"
                    }`}
                  >
                    {x.taux === null ? "—" : `${x.taux} %`}
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muet">
                    Aucun membre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muet">Taux = (présent + retard) ÷ appels enregistrés. « — » : aucun appel sur la période.</p>
      </section>
    </div>
  );
}
