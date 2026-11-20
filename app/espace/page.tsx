import Link from "next/link";
import { requireProfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aRole, estBureau } from "@/lib/roles";
import { LIBELLES_EVENEMENT, dateCourte, jourEtHeure, jourMois } from "@/lib/format";
import type { Evenement } from "@/lib/types";

export const metadata = { title: "Accueil" };

interface StatsPresident {
  taux_presence_moyen: number | null;
  nb_membres: number;
  nb_taches_ouvertes: number;
  nb_taches_en_retard: number;
  nb_demandes_attente: number;
  nb_evenements_a_venir: number;
}

export default async function TableauDeBord() {
  const profil = await requireProfil();
  const supabase = await createClient();
  const maintenant = new Date().toISOString();
  const voitStats = aRole(profil.role, "PRESIDENT", "VICE_PRESIDENT");

  const [presence, taches, evenements, stats] = await Promise.all([
    supabase.from("v_taux_presence").select("taux_presence, total_evenements").eq("user_id", profil.id).maybeSingle(),
    supabase
      .from("taches")
      .select("id, titre, deadline, statut", { count: "exact" })
      .eq("assigne_a", profil.id)
      .neq("statut", "TERMINE")
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(3),
    supabase.from("evenements").select("*").gte("date_debut", maintenant).order("date_debut").limit(3),
    voitStats ? supabase.rpc("stats_president").single() : Promise.resolve({ data: null }),
  ]);

  const taux = presence.data?.taux_presence;
  const prochains = (evenements.data ?? []) as Evenement[];
  const s = stats.data as StatsPresident | null;

  const kpis = s
    ? [
        { label: "Taux de présence moyen", valeur: s.taux_presence_moyen != null ? `${s.taux_presence_moyen} %` : "—", or: true },
        { label: "Membres", valeur: String(s.nb_membres) },
        { label: "Tâches en retard", valeur: String(s.nb_taches_en_retard), alerte: s.nb_taches_en_retard > 0 },
        { label: "Demandes en attente", valeur: String(s.nb_demandes_attente) },
      ]
    : [
        { label: "Mon taux de présence", valeur: taux != null ? `${taux} %` : "—", or: true },
        { label: "Mes tâches en cours", valeur: String(taches.count ?? 0) },
        { label: "Prochain événement", valeur: prochains[0] ? dateCourte(prochains[0].date_debut) : "—" },
      ];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muet capitalize">
          {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Casablanca" }).format(new Date())}
        </span>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Bonjour {profil.prenom}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1 rounded-2xl border border-bordure bg-surface p-4 md:p-5">
            <span className="text-xs text-muet md:text-sm">{k.label}</span>
            <span
              className={`text-2xl font-semibold tabular-nums md:text-3xl ${
                "or" in k && k.or ? "text-or" : "alerte" in k && k.alerte ? "text-alerte" : ""
              }`}
            >
              {k.valeur}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border border-bordure bg-surface p-5">
          <h2 className="font-semibold">Prochains événements</h2>
          {prochains.length === 0 && <p className="text-sm text-muet">Aucun événement programmé pour l&apos;instant.</p>}
          {prochains.map((e) => {
            const { jour, mois } = jourMois(e.date_debut);
            return (
              <div key={e.id} className="flex items-center gap-3.5 border-t border-bordure pt-3">
                <div className="w-13 flex-none rounded-xl bg-[#221f1b] py-1.5 text-center">
                  <div className="text-lg font-semibold">{jour}</div>
                  <div className="text-[11px] text-muet uppercase">{mois}</div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{e.titre}</span>
                  <span className="truncate text-sm text-muet">
                    {jourEtHeure(e.date_debut)}
                    {e.lieu ? ` · ${e.lieu}` : ""}
                  </span>
                </div>
                <span className="rounded-full bg-[#221f1b] px-2.5 py-0.5 text-xs font-semibold text-or">
                  {LIBELLES_EVENEMENT[e.type]}
                </span>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-bordure bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Mes tâches</h2>
            <Link href="/espace/taches" className="text-sm">
              Tout voir →
            </Link>
          </div>
          {(taches.data ?? []).length === 0 && <p className="text-sm text-muet">Aucune tâche en cours.</p>}
          {(taches.data ?? []).map((t) => {
            const enRetard = t.deadline && t.deadline < maintenant;
            return (
              <div key={t.id} className="flex flex-col gap-0.5 border-t border-bordure pt-3">
                <span className="font-medium">{t.titre}</span>
                {t.deadline && (
                  <span className={`text-xs ${enRetard ? "text-alerte" : "text-muet"}`}>
                    {enRetard ? "En retard · " : "Échéance "}
                    {dateCourte(t.deadline)}
                  </span>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {estBureau(profil.role) && (
        <Link
          href="/espace/bureau"
          className="flex items-center justify-between rounded-2xl border border-or bg-surface p-5 md:hidden"
        >
          <span className="font-semibold">Ouvrir l&apos;espace Bureau</span>
          <span className="text-or">→</span>
        </Link>
      )}
    </div>
  );
}
