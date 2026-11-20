"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImagePlus, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_URL } from "@/lib/config";

export interface Actualite {
  id: string;
  titre: string;
  contenu: string;
  image_url: string | null;
  lien_externe: string | null;
  date_publication: string;
  auteur?: { prenom: string; nom: string } | null;
}

const BUCKET = "actualites";
const TAILLE_MAX = 5 * 1024 * 1024;
const TYPES_IMAGE = ["image/png", "image/jpeg", "image/webp"];

const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Casablanca" });

export function imageActualite(chemin: string | null) {
  if (!chemin) return null;
  if (chemin.startsWith("http")) return chemin;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${chemin}`;
}

export function Actualites({ actualites, peutPublier, monId }: { actualites: Actualite[]; peutPublier: boolean; monId: string }) {
  const [edition, setEdition] = useState<Actualite | "nouvelle" | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Actualités</h1>
          <p className="text-doux">Les nouvelles du club : spectacles, tournages, castings, résultats…</p>
        </div>
        {peutPublier && (
          <button onClick={() => setEdition("nouvelle")} className="flex h-11 items-center gap-2 rounded-full bg-velours px-5 font-semibold text-white">
            <Plus size={18} aria-hidden /> Publier
          </button>
        )}
      </div>

      {actualites.length === 0 && (
        <div className="rounded-2xl border border-dashed border-bordure-2 bg-surface p-8 text-center text-muet">
          Aucune actualité pour l&apos;instant.
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {actualites.map((a) => (
          <CarteActualite key={a.id} a={a} peutPublier={peutPublier} onModifier={() => setEdition(a)} />
        ))}
      </ul>

      {edition && <FormulaireActualite actu={edition === "nouvelle" ? null : edition} monId={monId} onFermer={() => setEdition(null)} />}
    </div>
  );
}

function CarteActualite({ a, peutPublier, onModifier }: { a: Actualite; peutPublier: boolean; onModifier: () => void }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const image = imageActualite(a.image_url);
  const long = a.contenu.length > 320;

  async function supprimer() {
    setSuppression(true);
    const supabase = createClient();
    const { error } = await supabase.from("actualites").delete().eq("id", a.id);
    if (!error && a.image_url && !a.image_url.startsWith("http")) await supabase.storage.from(BUCKET).remove([a.image_url]);
    setSuppression(false);
    if (!error) router.refresh();
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-bordure bg-surface">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="flex flex-col gap-2.5 p-4 md:p-5">
        <p className="text-xs text-muet">
          {fmtDate.format(new Date(a.date_publication))}
          {a.auteur ? ` · ${a.auteur.prenom} ${a.auteur.nom}` : ""}
        </p>
        <h2 className="font-display text-xl font-bold md:text-2xl">{a.titre}</h2>
        <p className={`whitespace-pre-line text-doux ${long && !ouvert ? "line-clamp-5" : ""}`}>{a.contenu}</p>
        {long && (
          <button onClick={() => setOuvert(!ouvert)} className="w-fit text-sm font-semibold text-or">
            {ouvert ? "Réduire" : "Lire la suite"}
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {a.lien_externe && (
            <a
              href={a.lien_externe}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-1.5 rounded-full border border-or px-4 text-sm font-semibold text-or"
            >
              En savoir plus <ExternalLink size={14} aria-hidden />
            </a>
          )}
          {peutPublier && !confirmer && (
            <span className="ml-auto flex gap-1">
              <button onClick={onModifier} className="flex h-10 items-center gap-1.5 rounded-full border border-bordure-2 px-3.5 text-sm">
                <Pencil size={14} aria-hidden /> Modifier
              </button>
              <button
                onClick={() => setConfirmer(true)}
                aria-label={`Supprimer ${a.titre}`}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muet hover:text-alerte"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </span>
          )}
          {confirmer && (
            <span className="ml-auto flex flex-wrap items-center gap-2 rounded-xl border border-velours-clair/40 bg-velours/10 p-2">
              <span className="text-sm text-alerte">Supprimer ?</span>
              <button onClick={() => setConfirmer(false)} className="h-9 rounded-full px-3 text-sm text-doux">
                Annuler
              </button>
              <button
                onClick={supprimer}
                disabled={suppression}
                className="flex h-9 items-center gap-1.5 rounded-full bg-velours px-3.5 text-sm font-semibold text-white"
              >
                {suppression && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
                Supprimer
              </button>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

const champ = "h-12 w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 focus:border-or focus:outline-none";

function FormulaireActualite({ actu, monId, onFermer }: { actu: Actualite | null; monId: string; onFermer: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [titre, setTitre] = useState(actu?.titre ?? "");
  const [contenu, setContenu] = useState(actu?.contenu ?? "");
  const [lien, setLien] = useState(actu?.lien_externe ?? "");
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(imageActualite(actu?.image_url ?? null));
  const [retirerImage, setRetirerImage] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setErreur(null);
    if (!f) return;
    if (!TYPES_IMAGE.includes(f.type)) return setErreur("Image JPG, PNG ou WebP uniquement.");
    if (f.size > TAILLE_MAX) return setErreur("L'image dépasse 5 Mo.");
    setFichier(f);
    setRetirerImage(false);
    setApercu(URL.createObjectURL(f));
  }

  async function enregistrer(ev: React.FormEvent) {
    ev.preventDefault();
    setErreur(null);
    let lienPropre = lien.trim();
    if (lienPropre && !/^https?:\/\//i.test(lienPropre)) lienPropre = "https://" + lienPropre;

    setEnvoi(true);
    const supabase = createClient();
    let image_url = retirerImage ? null : (actu?.image_url ?? null);

    if (fichier) {
      const ext = fichier.type === "image/png" ? "png" : fichier.type === "image/webp" ? "webp" : "jpg";
      const chemin = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(chemin, fichier, { contentType: fichier.type });
      if (error) {
        setEnvoi(false);
        return setErreur("Envoi de l'image impossible : " + error.message);
      }
      image_url = chemin;
    }

    const valeurs = { titre: titre.trim(), contenu: contenu.trim(), lien_externe: lienPropre || null, image_url };
    const { error } = actu
      ? await supabase.from("actualites").update(valeurs).eq("id", actu.id)
      : await supabase.from("actualites").insert({ ...valeurs, publie_par: monId });

    // Ancienne image remplacée ou retirée : on la supprime du stockage
    if (!error && actu?.image_url && actu.image_url !== image_url && !actu.image_url.startsWith("http")) {
      await supabase.storage.from(BUCKET).remove([actu.image_url]);
    }
    setEnvoi(false);
    if (error) return setErreur("Publication impossible : " + error.message);
    onFermer();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center md:p-6" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={actu ? "Modifier l'actualité" : "Nouvelle actualité"}
        onClick={(e) => e.stopPropagation()}
        className="pb-safe max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-bordure-2 bg-surface p-5 md:rounded-3xl md:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{actu ? "Modifier l'actualité" : "Nouvelle actualité"}</h2>
          <button onClick={onFermer} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-full text-muet hover:bg-surface-2">
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={enregistrer} className="flex flex-col gap-4">
          <input ref={input} type="file" accept={TYPES_IMAGE.join(",")} className="hidden" onChange={choisir} />
          {apercu ? (
            <div className="relative overflow-hidden rounded-xl border border-bordure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={apercu} alt="Aperçu" className="aspect-[16/9] w-full object-cover" />
              <div className="absolute right-2 bottom-2 flex gap-2">
                <button type="button" onClick={() => input.current?.click()} className="h-9 rounded-full bg-black/70 px-3 text-sm text-white">
                  Changer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFichier(null);
                    setApercu(null);
                    setRetirerImage(true);
                  }}
                  className="h-9 rounded-full bg-black/70 px-3 text-sm text-white"
                >
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-bordure-2 text-sm text-muet"
            >
              <ImagePlus size={26} aria-hidden />
              Ajouter une image (facultatif, 5 Mo max)
            </button>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="titre-actu" className="text-sm text-doux">Titre</label>
            <input id="titre-actu" required value={titre} onChange={(e) => setTitre(e.target.value)} className={champ} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contenu-actu" className="text-sm text-doux">Texte</label>
            <textarea
              id="contenu-actu"
              required
              rows={6}
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              className="w-full rounded-xl border border-bordure-2 bg-fond-2 px-3.5 py-3 focus:border-or focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lien-actu" className="text-sm text-doux">Lien (facultatif : billetterie, vidéo, Instagram…)</label>
            <input id="lien-actu" type="text" inputMode="url" value={lien} onChange={(e) => setLien(e.target.value)} className={champ} placeholder="https://" />
          </div>

          {erreur && (
            <p role="alert" className="rounded-xl border border-velours-clair/40 bg-velours/10 p-3 text-sm text-alerte">
              {erreur}
            </p>
          )}

          <button disabled={envoi} className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-velours font-semibold text-white disabled:opacity-60">
            {envoi && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
            {actu ? "Enregistrer" : "Publier"}
          </button>
        </form>
      </div>
    </div>
  );
}
