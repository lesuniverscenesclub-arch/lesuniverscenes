import Link from "next/link";

export default function PageIntrouvable() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-display text-7xl font-bold text-or">404</p>
      <h1 className="text-xl font-semibold">Cette page n&apos;existe pas.</h1>
      <Link href="/espace" className="rounded-full bg-velours px-6 py-3 font-semibold text-white">
        Retour à mon espace
      </Link>
    </main>
  );
}
