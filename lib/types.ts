// Types alignés sur 01_schema_universcenes.sql — garder les deux synchronisés.

export type Role =
  | "MEMBRE"
  | "ADMIN"
  | "PRESIDENT"
  | "VICE_PRESIDENT"
  | "SECRETAIRE_GENERAL"
  | "RH"
  | "TRESORIER"
  | "RESP_ARTISTIQUE_COM"
  | "RESP_RP_LOGISTIQUE";

export type Pole = "THEATRE" | "CINEMA" | "LOGISTIQUE" | "COMMUNICATION";

export interface Profil {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  pole: Pole | null;
  poste: string | null;
  ordre_bureau: number | null;
  avatar_url: string | null;
  date_inscription: string;
}

export interface MembreBureauPublic {
  prenom: string;
  nom: string;
  poste: string;
  avatar_url: string | null;
  ordre: number;
}

export interface Actualite {
  id: string;
  titre: string;
  contenu: string;
  image_url: string | null;
  lien_externe: string | null;
  date_publication: string;
}

export interface Evenement {
  id: string;
  titre: string;
  description: string | null;
  type: "REPETITION" | "TOURNAGE" | "SPECTACLE" | "REUNION";
  date_debut: string;
  date_fin: string | null;
  lieu: string | null;
}

export interface CodeInvitation {
  id: string;
  code: string;
  est_utilise: boolean;
  utilise_par_user_id: string | null;
  utilise_le: string | null;
  cree_le: string;
  expire_le: string | null;
}
