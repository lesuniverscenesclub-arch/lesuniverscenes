export const metadata = { title: "Hors connexion" };
export const dynamic = "force-static";

export default function HorsLigne() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="h-24 w-24 object-contain" />
      <h1 className="font-display text-3xl font-bold">Pas de connexion</h1>
      <p className="max-w-sm text-doux">
        Vérifie ton Wi-Fi ou tes données mobiles, puis réessaie. L&apos;espace membres a besoin d&apos;internet pour
        afficher les informations à jour.
      </p>
      <a href="/espace" className="rounded-full bg-velours px-6 py-3 font-semibold text-white">
        Réessayer
      </a>
    </main>
  );
}
