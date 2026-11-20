import type { Role } from "./types";

/**
 * Droits côté interface. Ils MIROIRENT les politiques RLS du script SQL :
 * même si quelqu'un contourne l'interface, la base refuse.
 * ADMIN a toujours tous les droits (comme public.a_role() dans la base).
 */

export const LIBELLES_ROLES: Record<Role, string> = {
  MEMBRE: "Membre",
  ADMIN: "Administrateur",
  PRESIDENT: "Président",
  VICE_PRESIDENT: "Vice-présidence",
  SECRETAIRE_GENERAL: "Secrétariat général",
  RH: "Ressources humaines",
  TRESORIER: "Trésorerie",
  RESP_ARTISTIQUE_COM: "Artistique & communication",
  RESP_RP_LOGISTIQUE: "Relations publiques & logistique",
};

export const LIBELLES_POLES = {
  THEATRE: "Théâtre",
  CINEMA: "Cinéma",
  LOGISTIQUE: "Logistique",
  COMMUNICATION: "Communication",
} as const;

export function aRole(role: Role | null | undefined, ...roles: Role[]): boolean {
  if (!role) return false;
  return role === "ADMIN" || roles.includes(role);
}

export function estBureau(role: Role | null | undefined): boolean {
  return !!role && role !== "MEMBRE";
}

export type IconeNav =
  | "accueil"
  | "planning"
  | "taches"
  | "chat"
  | "guichet"
  | "profil"
  | "analytics"
  | "evenements"
  | "assigner"
  | "valider"
  | "appel"
  | "export"
  | "codes"
  | "archives"
  | "actualites"
  | "membres";

export interface LienNav {
  label: string;
  href: string;
  icone: IconeNav;
  /** absent = tout utilisateur connecté */
  roles?: Role[];
  /** affiché dans la barre du bas sur mobile */
  mobile?: boolean;
  /** page déjà développée (sinon : "bientôt disponible") */
  pret?: boolean;
}

export interface SectionNav {
  titre: string;
  liens: LienNav[];
}

export const NAVIGATION: SectionNav[] = [
  {
    titre: "Espace commun",
    liens: [
      { label: "Accueil", href: "/espace", icone: "accueil", mobile: true, pret: true },
      { label: "Planning", href: "/espace/planning", icone: "planning", mobile: true, pret: true },
      { label: "Mes tâches", href: "/espace/taches", icone: "taches" },
      { label: "Messagerie", href: "/espace/messagerie", icone: "chat", mobile: true },
      { label: "Guichet administratif", href: "/espace/guichet", icone: "guichet" },
      { label: "Mon profil", href: "/espace/profil", icone: "profil", mobile: true, pret: true },
    ],
  },
  {
    titre: "Présidence",
    liens: [
      { label: "Analytics", href: "/espace/presidence/analytics", icone: "analytics", roles: ["PRESIDENT", "VICE_PRESIDENT"] },
      { label: "Assigner des tâches", href: "/espace/presidence/taches", icone: "assigner", roles: ["PRESIDENT"] },
      { label: "Valider les demandes", href: "/espace/presidence/demandes", icone: "valider", roles: ["PRESIDENT"] },
    ],
  },
  {
    titre: "Ressources humaines",
    liens: [
      { label: "Feuille d'appel", href: "/espace/rh/appel", icone: "appel", roles: ["RH", "PRESIDENT"] },
      { label: "Exports présences", href: "/espace/rh/exports", icone: "export", roles: ["RH", "PRESIDENT"] },
      { label: "Codes d'invitation", href: "/espace/rh/codes", icone: "codes", roles: ["RH", "PRESIDENT"], pret: true },
    ],
  },
  {
    titre: "Secrétariat général",
    liens: [
      { label: "Archives & documents", href: "/espace/secretariat/documents", icone: "archives", roles: ["SECRETAIRE_GENERAL", "PRESIDENT"] },
      { label: "Demandes à traiter", href: "/espace/secretariat/demandes", icone: "valider", roles: ["SECRETAIRE_GENERAL"] },
    ],
  },
  {
    titre: "Communication",
    liens: [
      { label: "Publier une actualité", href: "/espace/communication/actualites", icone: "actualites", roles: ["SECRETAIRE_GENERAL", "RESP_ARTISTIQUE_COM", "PRESIDENT"] },
    ],
  },
  {
    titre: "Administration",
    liens: [
      { label: "Membres & rôles", href: "/espace/admin/membres", icone: "membres", roles: ["ADMIN"] },
    ],
  },
];

/** Navigation filtrée pour un rôle : un membre ne voit JAMAIS les sections du Bureau. */
export function navigationPour(role: Role): SectionNav[] {
  return NAVIGATION.map((s) => ({
    titre: s.titre,
    liens: s.liens.filter((l) => !l.roles || aRole(role, ...l.roles)),
  })).filter((s) => s.liens.length > 0);
}

/** Retrouve la page de navigation correspondant à un chemin. */
export function lienPourChemin(chemin: string): LienNav | undefined {
  for (const s of NAVIGATION) for (const l of s.liens) if (l.href === chemin) return l;
  return undefined;
}
