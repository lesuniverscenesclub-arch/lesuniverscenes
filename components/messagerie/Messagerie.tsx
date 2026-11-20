"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Lock, Megaphone, SendHorizontal, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/nav/Avatar";

export type Canal = "GENERAL" | "ANNONCES" | "THEATRE" | "CINEMA" | "BUREAU";

export interface Auteur {
  id: string;
  prenom: string;
  nom: string;
  avatar_url: string | null;
  poste: string | null;
}

interface Message {
  id: string;
  user_id: string;
  canal: Canal;
  contenu: string;
  timestamp: string;
}

const CANAUX: { cle: Canal; label: string; description: string; bureauSeul?: boolean; ecritureBureau?: boolean }[] = [
  { cle: "GENERAL", label: "Général", description: "Pour tout le club" },
  { cle: "ANNONCES", label: "Annonces", description: "Infos officielles du Bureau", ecritureBureau: true },
  { cle: "THEATRE", label: "Théâtre", description: "Pôle Théâtre" },
  { cle: "CINEMA", label: "Cinéma", description: "Pôle Cinéma" },
  { cle: "BUREAU", label: "Bureau", description: "Privé : Bureau uniquement", bureauSeul: true },
];

const FUSEAU = "Africa/Casablanca";
const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU });
const fmtJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSEAU });
const cleJour = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: FUSEAU });

function libelleJour(iso: string) {
  const j = cleJour(iso);
  const auj = cleJour(new Date().toISOString());
  const hier = cleJour(new Date(Date.now() - 864e5).toISOString());
  if (j === auj) return "Aujourd'hui";
  if (j === hier) return "Hier";
  return fmtJour.format(new Date(iso));
}

const LIMITE = 150;

export function Messagerie({
  monId,
  estBureau,
  peutModerer,
  auteurs: auteursInitiaux,
}: {
  monId: string;
  estBureau: boolean;
  peutModerer: boolean;
  auteurs: Auteur[];
}) {
  const canaux = CANAUX.filter((c) => !c.bureauSeul || estBureau);
  const [canal, setCanal] = useState<Canal>("GENERAL");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chargement, setChargement] = useState(true);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nonLus, setNonLus] = useState<Partial<Record<Canal, number>>>({});
  const [auteurs, setAuteurs] = useState(() => new Map(auteursInitiaux.map((a) => [a.id, a])));
  const fin = useRef<HTMLDivElement>(null);
  const canalRef = useRef(canal);
  canalRef.current = canal;
  const auteursRef = useRef(auteurs);
  auteursRef.current = auteurs;

  const infos = CANAUX.find((c) => c.cle === canal)!;
  const peutEcrire = !infos.ecritureBureau || estBureau;

  // Chargement du canal
  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur(null);
    createClient()
      .from("messages")
      .select("*")
      .eq("canal", canal)
      .order("timestamp", { ascending: false })
      .limit(LIMITE)
      .then(({ data, error }) => {
        if (annule) return;
        if (error) setErreur("Messages indisponibles : " + error.message);
        setMessages(((data ?? []) as Message[]).reverse());
        setChargement(false);
        setNonLus((n) => ({ ...n, [canal]: 0 }));
      });
    return () => {
      annule = true;
    };
  }, [canal]);

  // Temps réel : nouveaux messages et suppressions, tous canaux confondus
  useEffect(() => {
    const supabase = createClient();
    const abonnement = supabase
      .channel("messagerie")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const m = payload.new as Message;
        if (m.canal !== canalRef.current) {
          if (m.user_id !== monId) setNonLus((n) => ({ ...n, [m.canal]: (n[m.canal] ?? 0) + 1 }));
          return;
        }
        setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
        // Auteur inconnu (nouveau membre) : on récupère son nom
        if (!auteursRef.current.has(m.user_id)) {
          const { data } = await supabase
            .from("users")
            .select("id, prenom, nom, avatar_url, poste")
            .eq("id", m.user_id)
            .maybeSingle();
          if (data) setAuteurs((b) => new Map(b).set(data.id, data as Auteur));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setMessages((ms) => ms.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(abonnement);
    };
  }, [monId]);

  // Défilement automatique vers le dernier message
  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [messages, chargement]);

  async function envoyer(e?: React.FormEvent) {
    e?.preventDefault();
    const contenu = texte.trim();
    if (!contenu || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const { data, error } = await createClient()
      .from("messages")
      .insert({ user_id: monId, canal, contenu: contenu.slice(0, 4000) })
      .select()
      .single();
    setEnvoi(false);
    if (error) return setErreur("Message non envoyé : " + error.message);
    setTexte("");
    setMessages((ms) => (ms.some((x) => x.id === data.id) ? ms : [...ms, data as Message]));
  }

  async function supprimer(id: string) {
    const { error } = await createClient().from("messages").delete().eq("id", id);
    if (error) return setErreur("Suppression impossible : " + error.message);
    setMessages((ms) => ms.filter((x) => x.id !== id));
  }

  // Regroupement : séparateur de jour + messages consécutifs du même auteur
  const lignes = useMemo(
    () =>
      messages.map((m, i) => {
        const prec = messages[i - 1];
        const nouveauJour = !prec || cleJour(prec.timestamp) !== cleJour(m.timestamp);
        const suite =
          !nouveauJour &&
          prec.user_id === m.user_id &&
          new Date(m.timestamp).getTime() - new Date(prec.timestamp).getTime() < 5 * 60e3;
        return { m, nouveauJour, suite };
      }),
    [messages]
  );

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[420px] flex-col gap-3 md:h-[calc(100dvh-9rem)]">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Messagerie</h1>
      </div>

      {/* Canaux */}
      <div className="-mx-4 flex flex-none gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Canaux">
        {canaux.map((c) => (
          <button
            key={c.cle}
            role="tab"
            aria-selected={canal === c.cle}
            onClick={() => setCanal(c.cle)}
            className={`relative flex h-10 flex-none items-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${
              canal === c.cle ? "border-or bg-or text-encre" : "border-bordure-2 text-doux"
            }`}
          >
            {c.bureauSeul && <Lock size={13} aria-hidden />}
            {c.ecritureBureau && <Megaphone size={13} aria-hidden />}# {c.label}
            {!!nonLus[c.cle] && canal !== c.cle && (
              <span className="ml-0.5 rounded-full bg-velours px-1.5 text-xs text-white">{nonLus[c.cle]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Fil */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-bordure bg-surface">
        <p className="flex-none border-b border-bordure px-4 py-2.5 text-xs text-muet">{infos.description}</p>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4" aria-live="polite">
          {chargement ? (
            <div className="flex h-full items-center justify-center text-muet">
              <LoaderCircle className="animate-spin" aria-hidden />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muet">
              Aucun message dans ce canal. {peutEcrire ? "Lance la discussion !" : ""}
            </div>
          ) : (
            <ul className="flex flex-col">
              {lignes.map(({ m, nouveauJour, suite }) => {
                const a = auteurs.get(m.user_id);
                const moi = m.user_id === monId;
                return (
                  <li key={m.id}>
                    {nouveauJour && (
                      <div className="my-3 flex items-center gap-3 text-xs text-muet first:mt-0">
                        <span className="h-px flex-1 bg-bordure" />
                        <span className="first-letter:uppercase">{libelleJour(m.timestamp)}</span>
                        <span className="h-px flex-1 bg-bordure" />
                      </div>
                    )}
                    <div className={`group flex gap-2.5 rounded-xl px-1.5 py-1 hover:bg-surface-2 ${suite ? "" : "mt-2"}`}>
                      <div className="w-9 flex-none">
                        {!suite && <Avatar prenom={a?.prenom ?? "?"} nom={a?.nom ?? ""} chemin={a?.avatar_url ?? null} taille={36} bordure={false} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        {!suite && (
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className={`text-sm font-semibold ${moi ? "text-or" : ""}`}>
                              {a ? `${a.prenom} ${a.nom}` : "Membre"}
                            </span>
                            {a?.poste && <span className="text-xs text-or-clair">{a.poste}</span>}
                            <span className="text-xs text-muet">{fmtHeure.format(new Date(m.timestamp))}</span>
                          </div>
                        )}
                        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{m.contenu}</p>
                      </div>
                      {(moi || peutModerer) && (
                        <button
                          onClick={() => supprimer(m.id)}
                          aria-label="Supprimer le message"
                          className="flex h-8 w-8 flex-none items-center justify-center self-start rounded-full text-muet opacity-0 group-hover:opacity-100 hover:text-alerte focus:opacity-100"
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div ref={fin} />
        </div>

        {erreur && <p role="alert" className="mx-3 mb-2 rounded-xl bg-velours/10 p-2.5 text-sm text-alerte">{erreur}</p>}

        {peutEcrire ? (
          <form onSubmit={envoyer} className="flex flex-none items-end gap-2 border-t border-bordure p-2.5">
            <label htmlFor="message" className="sr-only">
              Message
            </label>
            <textarea
              id="message"
              rows={1}
              value={texte}
              maxLength={4000}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  envoyer();
                }
              }}
              placeholder={`Écrire dans #${infos.label}…`}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-bordure-2 bg-fond-2 px-3.5 py-2.5 focus:border-or focus:outline-none"
            />
            <button
              disabled={envoi || !texte.trim()}
              aria-label="Envoyer"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-velours text-white disabled:opacity-40"
            >
              {envoi ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <SendHorizontal size={18} aria-hidden />}
            </button>
          </form>
        ) : (
          <p className="flex-none border-t border-bordure p-3 text-center text-sm text-muet">Seul le Bureau peut écrire dans ce canal.</p>
        )}
      </div>
    </div>
  );
}
