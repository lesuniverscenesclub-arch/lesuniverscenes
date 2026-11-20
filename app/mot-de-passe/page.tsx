"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/config";

export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${SITE_URL}/auth/callback?suite=/mot-de-passe/nouveau`,
    });
    setChargement(false);
    setEnvoye(true); // même message que l'email existe ou non (ne révèle pas les comptes)
  }

  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 py-10">
      <Link href="/connexion" className="flex items-center gap-1.5 text-sm text-doux">
        <ChevronLeft size={18} aria-hidden /> Retour
      </Link>
      <h1 className="font-display text-3xl font-bold">Mot de passe oublié</h1>
      {envoye ? (
        <p role="status" className="rounded-xl border border-succes/40 bg-succes/10 p-4 text-succes">
          Si un compte existe pour {email}, un email avec un lien de réinitialisation vient d&apos;être envoyé.
        </p>
      ) : (
        <form onSubmit={envoyer} className="flex flex-col gap-4">
          <label htmlFor="email" className="text-sm font-medium text-doux">
            Ton email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-bordure-2 bg-surface px-3.5 focus:border-or focus:outline-none"
          />
          <button
            disabled={chargement}
            className="flex h-13 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white disabled:opacity-60"
          >
            {chargement && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
            Recevoir le lien
          </button>
        </form>
      )}
    </main>
  );
}
