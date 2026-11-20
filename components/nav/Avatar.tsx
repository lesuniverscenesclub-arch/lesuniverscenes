import { avatarUrl, initiales } from "@/lib/storage";

export function Avatar({
  prenom,
  nom,
  chemin,
  taille = 40,
  bordure = true,
}: {
  prenom: string;
  nom: string;
  chemin: string | null;
  taille?: number;
  bordure?: boolean;
}) {
  const url = avatarUrl(chemin);
  const style = { width: taille, height: taille };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        style={style}
        className={`flex-none rounded-full object-cover ${bordure ? "border-2 border-or" : ""}`}
      />
    );
  }
  return (
    <div
      style={{ ...style, fontSize: Math.round(taille * 0.36) }}
      className="flex flex-none items-center justify-center rounded-full bg-[#2a2621] font-bold text-or"
      aria-hidden
    >
      {initiales(prenom, nom)}
    </div>
  );
}
