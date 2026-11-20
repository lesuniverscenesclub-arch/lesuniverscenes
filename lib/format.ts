const FUSEAU = "Africa/Casablanca";

export function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: FUSEAU }).format(new Date(iso));
}

export function jourEtHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSEAU,
  }).format(new Date(iso));
}

export function jourMois(iso: string): { jour: string; mois: string } {
  const d = new Date(iso);
  return {
    jour: new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: FUSEAU }).format(d),
    mois: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: FUSEAU }).format(d),
  };
}

export const LIBELLES_EVENEMENT = {
  REPETITION: "Répétition",
  TOURNAGE: "Tournage",
  SPECTACLE: "Spectacle",
  REUNION: "Réunion",
} as const;
