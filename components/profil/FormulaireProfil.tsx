"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LIBELLES_POLES } from "@/lib/roles";
import { Avatar } from "@/components/nav/Avatar";
import type { Pole, Profil } from "@/lib/types";

const TAILLE_MAX = 640; // px : une photo de profil n'a pas besoin de plus

/** Redimensionne et recadre en carré côté téléphone avant l'envoi (≈ 60 Ko au lieu de 5 Mo). */
async function preparerPhoto(fichier: File): Promise<Blob> {
  const bitmap = await createImageBitmap(fichier);
  const cote = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - cote) / 2;
  const sy = (bitmap.height - cote) / 2;
  const taille = Math.min(TAILLE_MAX, cote);
  const canvas = document.createElement("canvas");
  canvas.width = taille;
  canvas.height = taille;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, cote, cote, 0, 0, taille, taille);
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error("conversion"))), "image/jpeg", 0.85));
}

const champ = "h-12 w-full rounded-xl border border-bordure-2 bg-surface px-3.5 focus:border-or focus:outline-none";
const champVerrouille = "h-12 w-full rounded-xl border border-bordure bg-fond-2 px-3.5 text-muet";

export function FormulaireProfil({
  profil,
  libellePoste,
  stats,
}: {
  profil: Profil;
  libellePoste: string;
  stats: { presence: number | null; evenements: number; demandes: number };
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputPhoto = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState(profil.avatar_url);
  const [prenom, setPrenom] = useState(profil.prenom);
  const [nom, setNom] = useState(profil.nom);
  const [pole, setPole] = useState<Pole | "">(profil.pole ?? "");
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function changerPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setEnvoiPhoto(true);
    setMessage(null);
    try {
      const photo = await preparerPhoto(fichier);
      const chemin = `${profil.id}/avatar-${Date.now()}.jpg`; // dossier = son propre id (règle de stockage)
      const { error: errEnvoi } = await supabase.storage
        .from("avatars")
        .upload(chemin, photo, { contentType: "image/jpeg", upsert: false });
      if (errEnvoi) throw errEnvoi;

      const { error: errProfil } = await supabase.from("users").update({ avatar_url: chemin }).eq("id", profil.id);
      if (errProfil) throw errProfil;

      // Supprime l'ancienne photo si elle était dans son dossier personnel
      if (avatar && avatar.startsWith(profil.id + "/")) await supabase.storage.from("avatars").remove([avatar]);

      setAvatar(chemin);
      setMessage({ ok: true, texte: "Photo mise à jour." });
      router.refresh();
    } catch {
      setMessage({ ok: false, texte: "La photo n'a pas pu être envoyée. Essaie une image JPG ou PNG." });
    } finally {
      setEnvoiPhoto(false);
    }
  }

  async function supprimerPhoto() {
    if (!avatar) return;
    setEnvoiPhoto(true);
    await supabase.from("users").update({ avatar_url: null }).eq("id", profil.id);
    if (avatar.startsWith(profil.id + "/")) await supabase.storage.from("avatars").remove([avatar]);
    setAvatar(null);
    setEnvoiPhoto(false);
    router.refresh();
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setMessage(null);
    const { error } = await supabase
      .from("users")
      .update({ prenom: prenom.trim(), nom: nom.trim(), pole: pole || null })
      .eq("id", profil.id);
    setEnregistrement(false);
    setMessage(error ? { ok: false, texte: "Enregistrement impossible." } : { ok: true, texte: "Profil enregistré." });
    if (!error) router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          {avatar ? (
            <Avatar prenom={prenom} nom={nom} chemin={avatar} taille={124} />
          ) : (
            <div className="rounded-full border-2 border-dashed border-or p-0.5">
              <Avatar prenom={prenom} nom={nom} chemin={null} taille={116} />
            </div>
          )}
          <button
            type="button"
            onClick={() => inputPhoto.current?.click()}
            disabled={envoiPhoto}
            aria-label={avatar ? "Changer ma photo" : "Ajouter ma photo"}
            className="absolute right-0 bottom-0.5 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-fond bg-or text-encre"
          >
            {envoiPhoto ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Camera size={19} aria-hidden />}
          </button>
          {/* Sur téléphone, ce champ propose « Prendre une photo » ou « Galerie » */}
          <input ref={inputPhoto} type="file" accept="image/*" className="hidden" onChange={changerPhoto} />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xl font-semibold">
            {prenom} {nom}
          </span>
          <span className="rounded-full bg-[#2a2213] px-3 py-0.5 text-xs font-semibold text-or-clair">{libellePoste}</span>
        </div>
        {!avatar ? (
          <button
            type="button"
            onClick={() => inputPhoto.current?.click()}
            className="h-11 rounded-full bg-velours px-5 text-sm font-semibold text-white"
          >
            Ajouter ma photo
          </button>
        ) : (
          <button type="button" onClick={supprimerPhoto} className="flex items-center gap-1.5 text-sm text-muet">
            <Trash2 size={15} aria-hidden /> Retirer la photo
          </button>
        )}
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        <Stat valeur={stats.presence != null ? `${stats.presence} %` : "—"} label="Présence" or />
        <Stat valeur={String(stats.evenements)} label="Événements" />
        <Stat valeur={String(stats.demandes)} label={stats.demandes > 1 ? "Demandes" : "Demande"} />
      </section>

      {message && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm ${
            message.ok ? "border-succes/40 bg-succes/10 text-succes" : "border-velours-clair/40 bg-velours/10 text-alerte"
          }`}
        >
          {message.texte}
        </p>
      )}

      <form onSubmit={enregistrer} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Champ id="prenom" label="Prénom">
            <input id="prenom" required value={prenom} onChange={(e) => setPrenom(e.target.value)} className={champ} />
          </Champ>
          <Champ id="nom" label="Nom">
            <input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
          </Champ>
        </div>
        <Champ id="pole" label="Pôle">
          <select id="pole" value={pole} onChange={(e) => setPole(e.target.value as Pole | "")} className={champ}>
            <option value="">— Aucun —</option>
            {Object.entries(LIBELLES_POLES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Champ>
        <Champ id="email" label="Email">
          <input id="email" value={profil.email} readOnly className={champVerrouille} />
        </Champ>
        <Champ id="poste" label={profil.role === "MEMBRE" ? "Statut" : "Poste au Bureau"}>
          <input id="poste" value={libellePoste} readOnly className={champVerrouille} />
          <span className="text-xs text-muet">Seul le Président peut modifier un rôle ou un poste.</span>
        </Champ>
        <button
          disabled={enregistrement}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-or font-semibold text-encre disabled:opacity-60"
        >
          {enregistrement && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}

function Champ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-doux">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({ valeur, label, or }: { valeur: string; label: string; or?: boolean }) {
  return (
    <div className="rounded-xl border border-bordure bg-surface px-2 py-3 text-center">
      <div className={`text-xl font-semibold ${or ? "text-or" : ""}`}>{valeur}</div>
      <div className="text-[11px] text-muet">{label}</div>
    </div>
  );
}
