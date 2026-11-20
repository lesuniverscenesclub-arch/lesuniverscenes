/**
 * Bandeau « Version bêta » affiché en haut de toutes les pages.
 * Pour le retirer à la sortie de la bêta : supprimer ce fichier.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div role="status" className="pt-safe bg-or text-encre">
        <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-xs font-semibold md:text-sm">
          Version bêta : l&apos;app est en cours de construction. Un souci ? Écris à{" "}
          <a href="mailto:lesuniverscenesclub@gmail.com" className="text-encre underline">
            lesuniverscenesclub@gmail.com
          </a>
        </p>
      </div>
      {children}
    </>
  );
}
