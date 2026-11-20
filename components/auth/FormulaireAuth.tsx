"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, LoaderCircle, Ticket, CircleX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/config";

type Mode = "connexion" | "inscription";

const champ =
  "h-12 w-full rounded-xl border border-bordure-2 bg-surface px-3.5 text-texte placeholder:text-muet/70 focus:border-or focus:outline-none";

export function FormulaireAuth({ suite, message }: { suite?: string; message?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("connexion");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  // Champs
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [codeValide, setCodeValide] = useState<boolean | null>(null);

  // Lien d'email expiré ou déjà utilisé : Supabase renvoie l'erreur dans l'adresse (#error=...)
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = hash.get("error_code");
    if (!code) return;
    setErreur(
      code === "otp_expired"
        ? "Ce lien de confirmation a expiré ou a déjà été utilisé. Essaie de te connecter : ton email est peut-être déjà confirmé."
        : "Le lien reçu par email n'est pas valide. Essaie de te connecter."
    );
  }, []);

  async function verifierCode(valeur: string) {
    const c = valeur.trim().toUpperCase();
    if (c.length < 10) return setCodeValide(null);
    const { data } = await supabase.rpc("code_invitation_valide", { p_code: c });
    setCodeValide(data === true);
  }

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
    setChargement(false);
    if (error) {
      setErreur(
        error.message.includes("Email not confirmed")
          ? "Ton email n'est pas encore confirmé : clique sur le lien reçu par email."
          : "Email ou mot de passe incorrect."
      );
      return;
    }
    router.replace(suite && suite.startsWith("/espace") ? suite : "/espace");
    router.refresh();
  }

  async function sInscrire(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (motDePasse.length < 8) return setErreur("Le mot de passe doit contenir au moins 8 caractères.");
    setChargement(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: motDePasse,
      options: {
        emailRedirectTo: `${SITE_URL}/auth/callback?suite=/espace`,
        data: { prenom: prenom.trim(), nom: nom.trim(), code_invitation: code.trim().toUpperCase() },
      },
    });
    setChargement(false);

    if (error) {
      // Le refus vient du trigger SQL (code manquant/invalide) : Supabase renvoie une erreur générique.
      if (/already registered|already exists/i.test(error.message)) {
        setErreur("Un compte existe déjà avec cet email. Connecte-toi.");
      } else {
        setErreur(
          code.trim()
            ? "Inscription refusée : le code d'invitation est invalide, expiré ou déjà utilisé."
            : "Inscription refusée : un code d'invitation est nécessaire (sauf pour les emails du Bureau)."
        );
      }
      return;
    }

    if (data.session) {
      router.replace("/espace");
      router.refresh();
    } else {
      setSucces(`Compte créé ! Ouvre l'email envoyé à ${email.trim()} et clique sur le lien pour l'activer.`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Mode" className="flex rounded-full border border-bordure bg-surface p-1">
        {(["connexion", "inscription"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setErreur(null);
              setSucces(null);
            }}
            className={`h-11 flex-1 rounded-full font-semibold transition ${mode === m ? "bg-or text-encre" : "text-doux"}`}
          >
            {m === "connexion" ? "Connexion" : "Inscription"}
          </button>
        ))}
      </div>

      {message && !erreur && !succes && (
        <p className="rounded-xl border border-or/40 bg-or/10 p-3 text-sm text-or-clair">{message}</p>
      )}
      {erreur && (
        <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
          {erreur}
        </p>
      )}
      {succes && (
        <p role="status" className="rounded-xl border border-succes/40 bg-succes/10 p-3 text-sm text-succes">
          {succes}
        </p>
      )}

      {mode === "connexion" ? (
        <form onSubmit={seConnecter} className="flex flex-col gap-4">
          <Champ id="email" label="Email">
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} placeholder="prenom.nom@universiapolis.ma" />
          </Champ>
          <Champ id="mdp" label="Mot de passe">
            <input id="mdp" type="password" required autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={champ} />
          </Champ>
          <Link href="/mot-de-passe" className="self-end text-sm text-or">
            Mot de passe oublié ?
          </Link>
          <BoutonEnvoyer chargement={chargement}>Se connecter</BoutonEnvoyer>
          <p className="text-center text-xs text-muet">
            Membres du Bureau : connectez-vous avec l&apos;email enregistré par le club.
          </p>
        </form>
      ) : (
        <form onSubmit={sInscrire} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Champ id="prenom" label="Prénom">
              <input id="prenom" required autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} className={champ} />
            </Champ>
            <Champ id="nom" label="Nom">
              <input id="nom" required autoComplete="family-name" value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
            </Champ>
          </div>
          <Champ id="email-i" label="Email">
            <input id="email-i" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} />
          </Champ>
          <Champ id="mdp-i" label="Mot de passe (8 caractères minimum)">
            <input id="mdp-i" type="password" required minLength={8} autoComplete="new-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={champ} />
          </Champ>
          <Champ id="code" label="Code d'invitation du club">
            <div
              className={`flex h-12 items-center gap-2.5 rounded-xl border bg-surface px-3.5 ${
                codeValide === false ? "border-velours-clair" : codeValide ? "border-succes" : "border-or"
              }`}
            >
              <Ticket size={18} className="flex-none text-or" aria-hidden />
              <input
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  verifierCode(e.target.value);
                }}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="UNIV-XXXXX-XXXXX"
                className="min-w-0 flex-1 bg-transparent font-mono tracking-wide uppercase focus:outline-none"
              />
              {codeValide === true && <CircleCheck size={18} className="text-succes" aria-label="Code valide" />}
              {codeValide === false && <CircleX size={18} className="text-velours-clair" aria-label="Code invalide" />}
            </div>
            <span className={`text-xs ${codeValide === false ? "text-alerte" : "text-muet"}`}>
              {codeValide === false
                ? "Ce code n'est pas valide (ou déjà utilisé)."
                : codeValide
                  ? "Code valide : ton compte sera créé avec le rôle Membre."
                  : "Demande ton code au Bureau. Membres du Bureau : laissez vide."}
            </span>
          </Champ>
          <BoutonEnvoyer chargement={chargement}>Créer mon compte</BoutonEnvoyer>
        </form>
      )}
    </div>
  );
}

function Champ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-doux">
        {label}
      </label>
      {children}
    </div>
  );
}

function BoutonEnvoyer({ chargement, children }: { chargement: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={chargement}
      className="mt-1 flex h-13 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white transition disabled:opacity-60"
    >
      {chargement && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
