"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NouveauMotDePasse() {
  const router = useRouter();
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (mdp.length < 8) return setErreur("8 caractères minimum.");
    if (mdp !== confirmation) return setErreur("Les deux mots de passe ne correspondent pas.");
    setChargement(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setChargement(false);
    if (error) return setErreur("Le lien a expiré. Refais une demande de mot de passe oublié.");
    await supabase.auth.signOut();
    router.replace("/connexion?message=mot-de-passe-modifie");
  }

  const champ = "h-12 rounded-xl border border-bordure-2 bg-surface px-3.5 focus:border-or focus:outline-none";

  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Nouveau mot de passe</h1>
      {erreur && (
        <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
          {erreur}
        </p>
      )}
      <form onSubmit={enregistrer} className="flex flex-col gap-4">
        <label htmlFor="mdp" className="text-sm font-medium text-doux">Nouveau mot de passe</label>
        <input id="mdp" type="password" autoComplete="new-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} className={champ} />
        <label htmlFor="mdp2" className="text-sm font-medium text-doux">Confirmer</label>
        <input id="mdp2" type="password" autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={champ} />
        <button disabled={chargement} className="flex h-13 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white disabled:opacity-60">
          {chargement && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </main>
  );
}
