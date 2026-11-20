-- =============================================================================
--  LES UNIVERSCÈNES APP — Étape 1 : Schéma de base de données + sécurité (RLS)
--  Cible : Supabase (PostgreSQL 15+)
--  À exécuter en une fois dans : Supabase Dashboard > SQL Editor
--
--  Sommaire
--    0. Extensions
--    1. Types énumérés
--    2. Tables
--    3. Index
--    4. Fonctions utilitaires de rôle (utilisées par les politiques RLS)
--    5. Inscription : création du profil, code d'invitation, comptes Bureau
--    6. Garde-fous métier (triggers anti-escalade de privilèges)
--    7. Fonctions RPC (codes d'invitation, statistiques)
--    8. Vues (taux de présence, tâches en retard)
--    9. Row Level Security (RLS)
--   10. Stockage (buckets + politiques)
--   11. Realtime (chat)
--   12. Données d'amorçage (comptes Bureau)
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================
create extension if not exists pgcrypto with schema extensions;


-- =============================================================================
-- 1. TYPES ÉNUMÉRÉS
--    Valeurs techniques en MAJUSCULES sans accents ; les libellés FR
--    ("Théâtre", "À faire"…) sont gérés côté frontend.
-- =============================================================================
create type public.role_utilisateur as enum (
  'MEMBRE',
  'ADMIN',                 -- Administrateur général du club : tous les droits
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETAIRE_GENERAL',
  'RH',
  'TRESORIER',
  'RESP_ARTISTIQUE_COM',   -- Responsable artistique & communication
  'RESP_RP_LOGISTIQUE'     -- Responsable relations publiques & logistique
);
-- Les vice-responsables reçoivent le même rôle (donc les mêmes droits) que
-- leur responsable ; leur intitulé exact est stocké dans la colonne "poste".

create type public.pole_club as enum (
  'THEATRE', 'CINEMA', 'LOGISTIQUE', 'COMMUNICATION'
);

create type public.type_evenement as enum (
  'REPETITION', 'TOURNAGE', 'SPECTACLE', 'REUNION'
);

create type public.statut_presence as enum (
  'PRESENT', 'ABSENT', 'RETARD', 'JUSTIFIE'
);

create type public.statut_tache as enum (
  'A_FAIRE', 'EN_COURS', 'TERMINE'
);

create type public.priorite_tache as enum (
  'BASSE', 'NORMALE', 'HAUTE', 'URGENTE'
);

create type public.categorie_document as enum (
  'COMPTE_RENDU', 'DEMANDE_OFFICIELLE', 'SCENARIO', 'AUTRE'
);

create type public.visibilite_document as enum (
  'BUREAU',   -- visible uniquement par le Bureau (comptes rendus, courriers…)
  'MEMBRES'   -- visible par tous les membres connectés (scénarios…)
);

create type public.type_document_admin as enum (
  'ATTESTATION_MEMBRE',
  'ATTESTATION_PARTICIPATION',
  'AUTORISATION_ABSENCE',
  'AUTRE'
);

create type public.statut_demande as enum (
  'EN_ATTENTE', 'VALIDE', 'REFUSE'
);

create type public.canal_chat as enum (
  'GENERAL',   -- tout le monde lit et écrit
  'ANNONCES',  -- tout le monde lit, seul le Bureau écrit
  'THEATRE',   -- pôle Théâtre
  'CINEMA',    -- pôle Cinéma
  'BUREAU'     -- privé : Bureau uniquement
);


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- 2.1 Profils utilisateurs (1-1 avec auth.users, créés automatiquement)
create table public.users (
  id               uuid primary key references auth.users (id) on delete cascade,
  nom              text not null default '',
  prenom           text not null default '',
  email            text not null unique,
  role             public.role_utilisateur not null default 'MEMBRE',
  pole             public.pole_club,
  poste            text,          -- intitulé affiché : "Vice-trésorière", "Responsable RH"…
  ordre_bureau     int,           -- ordre d'affichage dans "Notre Bureau"
  avatar_url       text,          -- chemin dans le bucket "avatars"
  date_inscription timestamptz not null default now()
);
comment on table public.users is
  'Profil applicatif. Créé par trigger à l''inscription ; jamais inséré directement par le client.';

-- 2.2 Comptes Bureau pré-configurés (liste blanche d'emails -> rôle)
create table public.bureau_preconfigure (
  email      text primary key check (email = lower(email)),
  role       public.role_utilisateur not null check (role <> 'MEMBRE'),
  nom        text not null default '',
  prenom     text not null default '',
  pole       public.pole_club,
  poste      text not null,
  ordre      int  not null default 100,
  avatar_url text,                 -- photo initiale (bucket avatars, dossier bureau/), facultative
  active_le  timestamptz           -- rempli lors de la première connexion
);
comment on table public.bureau_preconfigure is
  'Emails autorisés à obtenir un rôle du Bureau à la création du compte, sans code d''invitation.';

-- 2.3 Codes d'invitation
create table public.club_codes (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  est_utilise         boolean not null default false,
  utilise_par_user_id uuid references public.users (id) on delete set null,
  utilise_le          timestamptz,
  cree_par            uuid references public.users (id) on delete set null,
  cree_le             timestamptz not null default now(),
  expire_le           timestamptz,
  constraint club_codes_coherence check (
    (est_utilise = false and utilise_par_user_id is null)
    or est_utilise = true
  )
);

-- 2.4 Événements
create table public.evenements (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(trim(titre)) > 0),
  description text,
  type        public.type_evenement not null,
  date_debut  timestamptz not null,
  date_fin    timestamptz,
  lieu        text,
  cree_par    uuid references public.users (id) on delete set null,
  cree_le     timestamptz not null default now(),
  constraint evenements_dates check (date_fin is null or date_fin >= date_debut)
);

-- 2.5 Présences
create table public.presences (
  id           uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references public.evenements (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  statut       public.statut_presence not null,
  remarque     text,
  marque_par   uuid references public.users (id) on delete set null,
  marque_le    timestamptz not null default now(),
  constraint presences_unique unique (evenement_id, user_id)
);

-- 2.6 Tâches
create table public.taches (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(trim(titre)) > 0),
  description text,
  assigne_a   uuid not null references public.users (id) on delete cascade,
  assigne_par uuid references public.users (id) on delete set null,
  statut      public.statut_tache not null default 'A_FAIRE',
  deadline    timestamptz,
  priorite    public.priorite_tache not null default 'NORMALE',
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);

-- 2.7 Documents (archives du club)
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  titre         text not null check (length(trim(titre)) > 0),
  categorie     public.categorie_document not null default 'AUTRE',
  visibilite    public.visibilite_document not null default 'BUREAU',
  fichier_url   text not null,   -- chemin dans le bucket "documents" (pas une URL publique)
  uploade_par   uuid references public.users (id) on delete set null,
  date_creation timestamptz not null default now()
);

-- 2.8 Demandes administratives
create table public.demandes_administratives (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  type_document       public.type_document_admin not null,
  motif               text,
  statut              public.statut_demande not null default 'EN_ATTENTE',
  fichier_genere_url  text,      -- chemin dans le bucket "demandes" : {user_id}/{demande_id}.pdf
  commentaire_bureau  text,      -- motif de refus, précisions…
  traite_par          uuid references public.users (id) on delete set null,
  date_demande        timestamptz not null default now(),
  date_traitement     timestamptz,
  constraint demandes_valide_avec_fichier check (
    statut <> 'VALIDE' or fichier_genere_url is not null
  )
);

-- 2.9 Messages (chat temps réel)
create table public.messages (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.users (id) on delete cascade,
  canal     public.canal_chat not null default 'GENERAL',
  contenu   text not null check (length(trim(contenu)) between 1 and 4000),
  timestamp timestamptz not null default now()
);

-- 2.10 Actualités (publiques)
create table public.actualites (
  id               uuid primary key default gen_random_uuid(),
  titre            text not null check (length(trim(titre)) > 0),
  contenu          text not null,
  image_url        text,
  lien_externe     text,
  date_publication timestamptz not null default now(),
  publie_par       uuid references public.users (id) on delete set null
);


-- =============================================================================
-- 3. INDEX
-- =============================================================================
create index on public.users (role);
create index on public.club_codes (utilise_par_user_id);
create index on public.evenements (date_debut);
create index on public.presences (user_id);
create index on public.presences (evenement_id);
create index on public.taches (assigne_a, statut);
create index on public.taches (deadline) where statut <> 'TERMINE';
create index on public.documents (categorie, date_creation desc);
create index on public.demandes_administratives (user_id, date_demande desc);
create index on public.demandes_administratives (statut);
create index on public.messages (canal, timestamp desc);
create index on public.actualites (date_publication desc);


-- =============================================================================
-- 4. FONCTIONS UTILITAIRES DE RÔLE
--    SECURITY DEFINER : lisent public.users sans déclencher la RLS
--    (évite la récursion infinie dans les politiques de la table users).
-- =============================================================================
create or replace function public.mon_role()
returns public.role_utilisateur
language sql stable security definer set search_path = ''
as $$
  select role from public.users where id = (select auth.uid());
$$;

create or replace function public.est_bureau()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role <> 'MEMBRE' from public.users where id = (select auth.uid())),
    false
  );
$$;

-- a_role(...) : vrai si l'utilisateur a l'un des rôles donnés.
-- Le rôle ADMIN passe TOUJOURS : l'administrateur général contrôle tout.
create or replace function public.a_role(variadic roles public.role_utilisateur[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role = 'ADMIN' or role = any (roles)
     from public.users where id = (select auth.uid())),
    false
  );
$$;

revoke execute on function public.mon_role()  from public, anon;
revoke execute on function public.est_bureau() from public, anon;
revoke execute on function public.a_role(public.role_utilisateur[]) from public, anon;
grant  execute on function public.mon_role()  to authenticated;
grant  execute on function public.est_bureau() to authenticated;
grant  execute on function public.a_role(public.role_utilisateur[]) to authenticated;


-- =============================================================================
-- 5. INSCRIPTION
--    Côté client :
--      supabase.auth.signUp({ email, password,
--        options: { data: { nom, prenom, code_invitation } } })
--    - Email présent dans bureau_preconfigure -> rôle du Bureau, pas de code requis.
--    - Sinon, code d'invitation valide obligatoire -> rôle MEMBRE, code consommé.
--    - Sinon, l'exception annule la création du compte auth.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta    jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_bureau  public.bureau_preconfigure%rowtype;
  v_code    text  := upper(trim(v_meta ->> 'code_invitation'));
  v_code_id uuid;
begin
  -- 5.a Compte du Bureau pré-configuré
  select * into v_bureau
  from public.bureau_preconfigure
  where email = lower(new.email);

  if found then
    insert into public.users (id, email, nom, prenom, role, pole, poste, ordre_bureau, avatar_url)
    values (
      new.id,
      lower(new.email),
      coalesce(nullif(v_bureau.nom, ''),    v_meta ->> 'nom',    ''),
      coalesce(nullif(v_bureau.prenom, ''), v_meta ->> 'prenom', ''),
      v_bureau.role,
      v_bureau.pole,
      v_bureau.poste,
      v_bureau.ordre,
      v_bureau.avatar_url
    );
    update public.bureau_preconfigure set active_le = now() where email = v_bureau.email;
    return new;
  end if;

  -- 5.b Membre actif : code d'invitation obligatoire
  if v_code is null or v_code = '' then
    raise exception 'CODE_INVITATION_REQUIS' using errcode = 'P0001';
  end if;

  select id into v_code_id
  from public.club_codes
  where code = v_code
    and est_utilise = false
    and (expire_le is null or expire_le > now())
  for update;               -- verrou : un code ne peut pas servir deux fois en parallèle

  if v_code_id is null then
    raise exception 'CODE_INVITATION_INVALIDE' using errcode = 'P0001';
  end if;

  insert into public.users (id, email, nom, prenom, role)
  values (
    new.id,
    lower(new.email),
    coalesce(v_meta ->> 'nom', ''),
    coalesce(v_meta ->> 'prenom', ''),
    'MEMBRE'
  );

  update public.club_codes
  set est_utilise = true, utilise_par_user_id = new.id, utilise_le = now()
  where id = v_code_id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garder l'email du profil synchronisé si l'utilisateur le change dans Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.users set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();


-- =============================================================================
-- 6. GARDE-FOUS MÉTIER
--    La RLS dit QUI peut modifier une ligne ; ces triggers disent QUELLES
--    colonnes. auth.uid() est NULL pour le service_role / SQL Editor : on laisse
--    alors passer (opérations d'administration).
-- =============================================================================

-- 6.1 users : seul le Président peut changer un rôle ; personne ne change son email ici
create or replace function public.proteger_users()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.date_inscription is distinct from old.date_inscription then
    raise exception 'Champ non modifiable (id, email, date_inscription).';
  end if;

  if (new.role, new.poste, new.ordre_bureau)
     is distinct from (old.role, old.poste, old.ordre_bureau)
     and not public.a_role('PRESIDENT') then
    raise exception 'Seul le Président peut modifier un rôle ou un poste.';
  end if;
  -- Seul un ADMIN peut donner ou retirer le rôle ADMIN.
  if (new.role = 'ADMIN' or old.role = 'ADMIN')
     and new.role is distinct from old.role
     and not exists (select 1 from public.users
                     where id = (select auth.uid()) and role = 'ADMIN') then
    raise exception 'Seul un administrateur peut gérer le rôle ADMIN.';
  end if;
  -- nom, prénom, pôle et photo (avatar_url) restent modifiables par chacun.

  return new;
end;
$$;

create trigger users_proteger
  before update on public.users
  for each row execute function public.proteger_users();

-- 6.2 taches : le membre assigné ne peut changer QUE le statut
create or replace function public.proteger_taches()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.maj_le := now();

  if (select auth.uid()) is null or public.a_role('PRESIDENT') then
    return new;
  end if;

  if (new.titre, new.description, new.assigne_a, new.assigne_par,
      new.deadline, new.priorite, new.cree_le)
     is distinct from
     (old.titre, old.description, old.assigne_a, old.assigne_par,
      old.deadline, old.priorite, old.cree_le) then
    raise exception 'Vous ne pouvez modifier que le statut de vos tâches.';
  end if;

  return new;
end;
$$;

create trigger taches_proteger
  before update on public.taches
  for each row execute function public.proteger_taches();

-- 6.3 demandes : traçabilité automatique du traitement
create or replace function public.tracer_traitement_demande()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.statut is distinct from old.statut and new.statut <> 'EN_ATTENTE' then
    new.traite_par      := (select auth.uid());
    new.date_traitement := now();
  end if;
  -- l'auteur et la date de la demande sont figés
  new.user_id      := old.user_id;
  new.date_demande := old.date_demande;
  return new;
end;
$$;

create trigger demandes_tracer
  before update on public.demandes_administratives
  for each row execute function public.tracer_traitement_demande();

-- 6.4 presences : traçabilité de l'appel
create or replace function public.tracer_presence()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.marque_par := coalesce((select auth.uid()), new.marque_par);
  new.marque_le  := now();
  return new;
end;
$$;

create trigger presences_tracer
  before insert or update on public.presences
  for each row execute function public.tracer_presence();


-- =============================================================================
-- 7. FONCTIONS RPC
-- =============================================================================

-- 7.1 Génération de codes d'invitation (RH, Président)
--     Format : UNIV-XXXXX-XXXXX (40 bits d'aléa)
--     Appel : supabase.rpc('generer_codes_invitation', { p_nombre: 5, p_validite_jours: 30 })
create or replace function public.generer_codes_invitation(
  p_nombre         int default 1,
  p_validite_jours int default 30
)
returns setof public.club_codes
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.a_role('PRESIDENT', 'RH') then
    raise exception 'Accès refusé : réservé au Président et au RH.';
  end if;
  if p_nombre not between 1 and 50 then
    raise exception 'Nombre de codes entre 1 et 50.';
  end if;

  return query
  insert into public.club_codes (code, cree_par, expire_le)
  select
    'UNIV-' || substr(h, 1, 5) || '-' || substr(h, 6, 5),
    (select auth.uid()),
    case when p_validite_jours is null then null
         else now() + make_interval(days => p_validite_jours) end
  from (
    select upper(encode(extensions.gen_random_bytes(5), 'hex')) as h
    from generate_series(1, p_nombre)
  ) g
  returning *;
end;
$$;

revoke execute on function public.generer_codes_invitation(int, int) from public, anon;
grant  execute on function public.generer_codes_invitation(int, int) to authenticated;

-- 7.2 Vérification d'un code AVANT l'inscription (UX du formulaire)
--     Ne révèle rien d'autre qu'un booléen.
create or replace function public.code_invitation_valide(p_code text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.club_codes
    where code = upper(trim(p_code))
      and est_utilise = false
      and (expire_le is null or expire_le > now())
  );
$$;

revoke execute on function public.code_invitation_valide(text) from public;
grant  execute on function public.code_invitation_valide(text) to anon, authenticated;


-- 7.3 Équipe du Bureau pour la page d'accueil publique ("Notre Bureau")
--     N'expose QUE prénom, nom, poste et photo : jamais l'email.
--     Affiche aussi les membres qui n'ont pas encore activé leur compte.
--     Appel : supabase.rpc('bureau_public')
create or replace function public.bureau_public()
returns table (prenom text, nom text, poste text, avatar_url text, ordre int)
language sql stable security definer set search_path = ''
as $$
  select
    coalesce(nullif(u.prenom, ''), b.prenom),
    coalesce(nullif(u.nom, ''),    b.nom),
    coalesce(u.poste, b.poste),
    coalesce(u.avatar_url, b.avatar_url),
    coalesce(u.ordre_bureau, b.ordre)
  from public.bureau_preconfigure b
  left join public.users u on u.email = b.email
  where b.role <> 'ADMIN'          -- le compte admin n'est pas une personne du Bureau
  order by 5, 2;
$$;

revoke execute on function public.bureau_public() from public;
grant  execute on function public.bureau_public() to anon, authenticated;


-- =============================================================================
-- 8. VUES
--    security_invoker = true : la RLS des tables sous-jacentes s'applique.
--    Un membre ne voit donc que SON taux ; le Bureau voit celui de tous.
-- =============================================================================

-- 8.1 Taux de présence par utilisateur
--     Formule : (PRESENT + RETARD) / (total - JUSTIFIE) × 100
--     Une absence justifiée ne pénalise pas le taux.
create view public.v_taux_presence
with (security_invoker = true) as
select
  p.user_id,
  count(*)                                         as total_evenements,
  count(*) filter (where p.statut = 'PRESENT')     as nb_presents,
  count(*) filter (where p.statut = 'RETARD')      as nb_retards,
  count(*) filter (where p.statut = 'ABSENT')      as nb_absents,
  count(*) filter (where p.statut = 'JUSTIFIE')    as nb_justifies,
  round(
    100.0 * count(*) filter (where p.statut in ('PRESENT', 'RETARD'))
    / nullif(count(*) filter (where p.statut <> 'JUSTIFIE'), 0),
    1
  )                                                as taux_presence
from public.presences p
group by p.user_id;

-- 8.2 Tâches en retard (analytics Président)
create view public.v_taches_en_retard
with (security_invoker = true) as
select t.*, u.nom as assigne_nom, u.prenom as assigne_prenom
from public.taches t
join public.users u on u.id = t.assigne_a
where t.statut <> 'TERMINE'
  and t.deadline is not null
  and t.deadline < now();

-- 8.3 Indicateurs globaux du tableau de bord Président
create or replace function public.stats_president()
returns table (
  taux_presence_moyen numeric,
  nb_membres          bigint,
  nb_taches_ouvertes  bigint,
  nb_taches_en_retard bigint,
  nb_demandes_attente bigint,
  nb_evenements_a_venir bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.a_role('PRESIDENT', 'VICE_PRESIDENT') then
    raise exception 'Accès refusé.';
  end if;

  return query
  select
    (select round(avg(v.taux_presence), 1) from public.v_taux_presence v),
    (select count(*) from public.users),
    (select count(*) from public.taches where statut <> 'TERMINE'),
    (select count(*) from public.taches
       where statut <> 'TERMINE' and deadline < now()),
    (select count(*) from public.demandes_administratives where statut = 'EN_ATTENTE'),
    (select count(*) from public.evenements where date_debut >= now());
end;
$$;

revoke execute on function public.stats_president() from public, anon;
grant  execute on function public.stats_president() to authenticated;


-- =============================================================================
-- 9. ROW LEVEL SECURITY
--    Règle d'or : RLS activée partout, aucune politique = aucun accès.
--    Matrice des droits (L = lecture, E = écriture) :
--
--    ADMIN (lesuniverscenesclub@gmail.com) a TOUS les droits ci-dessous.
--
--    Table                    | MEMBRE                 | BUREAU (tous)  | Spécifique
--    -------------------------+------------------------+----------------+-------------------------------
--    users                    | L tous, E soi          | idem           | PRESIDENT : E tous (+ rôle)
--    bureau_preconfigure      | —                      | —              | PRESIDENT : L/E
--    club_codes               | —                      | —              | PRESIDENT, RH : L/E
--    evenements               | L                      | L              | PRESIDENT, VP : E
--    presences                | L les siennes          | L toutes       | PRESIDENT, RH : E
--    taches                   | L/E(statut) les siennes| L toutes       | PRESIDENT : E toutes
--    documents                | L si MEMBRES           | L toutes       | PRESIDENT, SG : E
--    demandes_administratives | L/créer/annuler siennes| L toutes       | PRESIDENT, SG : traiter
--    messages                 | L/E hors BUREAU,       | L/E tous       | PRESIDENT : suppr. tout
--                             | ANNONCES en lecture    |                |
--    actualites               | L (anon aussi)         | L              | PRESIDENT, SG, RESP_COM : E
-- =============================================================================
alter table public.users                    enable row level security;
alter table public.bureau_preconfigure      enable row level security;
alter table public.club_codes               enable row level security;
alter table public.evenements               enable row level security;
alter table public.presences                enable row level security;
alter table public.taches                   enable row level security;
alter table public.documents                enable row level security;
alter table public.demandes_administratives enable row level security;
alter table public.messages                 enable row level security;
alter table public.actualites               enable row level security;

-- ---------- users ----------
create policy "users : lecture par les connectés"
  on public.users for select to authenticated
  using (true);

create policy "users : modification de son profil"
  on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "users : modification par le Président"
  on public.users for update to authenticated
  using (public.a_role('PRESIDENT'))
  with check (public.a_role('PRESIDENT'));

create policy "users : suppression par le Président"
  on public.users for delete to authenticated
  using (public.a_role('PRESIDENT') and id <> (select auth.uid()) and role <> 'ADMIN');
-- Pas de politique INSERT : seuls les triggers d'inscription créent des profils.

-- ---------- bureau_preconfigure ----------
create policy "bureau_preconfigure : gestion par le Président"
  on public.bureau_preconfigure for all to authenticated
  using (public.a_role('PRESIDENT'))
  with check (public.a_role('PRESIDENT'));

-- ---------- club_codes ----------
create policy "club_codes : lecture RH/Président"
  on public.club_codes for select to authenticated
  using (public.a_role('PRESIDENT', 'RH'));

create policy "club_codes : suppression des codes inutilisés RH/Président"
  on public.club_codes for delete to authenticated
  using (public.a_role('PRESIDENT', 'RH') and est_utilise = false);
-- Création via la RPC generer_codes_invitation() uniquement.

-- ---------- evenements ----------
create policy "evenements : lecture par les connectés"
  on public.evenements for select to authenticated
  using (true);

create policy "evenements : création Président/VP"
  on public.evenements for insert to authenticated
  with check (public.a_role('PRESIDENT', 'VICE_PRESIDENT')
              and cree_par = (select auth.uid()));

create policy "evenements : modification Président/VP"
  on public.evenements for update to authenticated
  using (public.a_role('PRESIDENT', 'VICE_PRESIDENT'))
  with check (public.a_role('PRESIDENT', 'VICE_PRESIDENT'));

create policy "evenements : suppression Président/VP"
  on public.evenements for delete to authenticated
  using (public.a_role('PRESIDENT', 'VICE_PRESIDENT'));

-- ---------- presences ----------
create policy "presences : lecture de ses présences"
  on public.presences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "presences : lecture par le Bureau"
  on public.presences for select to authenticated
  using (public.est_bureau());

create policy "presences : appel par RH/Président (insert)"
  on public.presences for insert to authenticated
  with check (public.a_role('PRESIDENT', 'RH'));

create policy "presences : appel par RH/Président (update)"
  on public.presences for update to authenticated
  using (public.a_role('PRESIDENT', 'RH'))
  with check (public.a_role('PRESIDENT', 'RH'));

create policy "presences : suppression RH/Président"
  on public.presences for delete to authenticated
  using (public.a_role('PRESIDENT', 'RH'));

-- ---------- taches ----------
create policy "taches : lecture de ses tâches"
  on public.taches for select to authenticated
  using (assigne_a = (select auth.uid()) or assigne_par = (select auth.uid()));

create policy "taches : lecture par le Bureau"
  on public.taches for select to authenticated
  using (public.est_bureau());

create policy "taches : création par le Président"
  on public.taches for insert to authenticated
  with check (public.a_role('PRESIDENT') and assigne_par = (select auth.uid()));

create policy "taches : mise à jour du statut par l'assigné"
  on public.taches for update to authenticated
  using (assigne_a = (select auth.uid()))
  with check (assigne_a = (select auth.uid()));
  -- le trigger taches_proteger limite la modification à la colonne statut

create policy "taches : modification par le Président"
  on public.taches for update to authenticated
  using (public.a_role('PRESIDENT'))
  with check (public.a_role('PRESIDENT'));

create policy "taches : suppression par le Président"
  on public.taches for delete to authenticated
  using (public.a_role('PRESIDENT'));

-- ---------- documents ----------
create policy "documents : lecture Bureau"
  on public.documents for select to authenticated
  using (public.est_bureau());

create policy "documents : lecture membres si visibles"
  on public.documents for select to authenticated
  using (visibilite = 'MEMBRES');

create policy "documents : ajout SG/Président"
  on public.documents for insert to authenticated
  with check (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL')
              and uploade_par = (select auth.uid()));

create policy "documents : modification SG/Président"
  on public.documents for update to authenticated
  using (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'))
  with check (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "documents : suppression SG/Président"
  on public.documents for delete to authenticated
  using (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

-- ---------- demandes_administratives ----------
create policy "demandes : lecture de ses demandes"
  on public.demandes_administratives for select to authenticated
  using (user_id = (select auth.uid()));

create policy "demandes : lecture SG/Président"
  on public.demandes_administratives for select to authenticated
  using (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "demandes : création par le membre"
  on public.demandes_administratives for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and statut = 'EN_ATTENTE'
    and fichier_genere_url is null
    and traite_par is null
  );

create policy "demandes : traitement SG/Président"
  on public.demandes_administratives for update to authenticated
  using (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'))
  with check (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "demandes : annulation par le membre tant qu'en attente"
  on public.demandes_administratives for delete to authenticated
  using (user_id = (select auth.uid()) and statut = 'EN_ATTENTE');

-- ---------- messages ----------
create policy "messages : lecture canaux ouverts"
  on public.messages for select to authenticated
  using (canal <> 'BUREAU' or public.est_bureau());

create policy "messages : envoi"
  on public.messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (canal in ('GENERAL', 'THEATRE', 'CINEMA') or public.est_bureau())
  );

create policy "messages : suppression de ses messages"
  on public.messages for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "messages : modération par le Président"
  on public.messages for delete to authenticated
  using (public.a_role('PRESIDENT'));
-- Pas d'UPDATE : un message envoyé n'est pas modifiable (simplicité + traçabilité).

-- ---------- actualites ----------
create policy "actualites : lecture publique"
  on public.actualites for select to anon, authenticated
  using (true);

create policy "actualites : publication SG/Président/Resp. com"
  on public.actualites for insert to authenticated
  with check (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_ARTISTIQUE_COM'));

create policy "actualites : modification SG/Président/Resp. com"
  on public.actualites for update to authenticated
  using (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_ARTISTIQUE_COM'))
  with check (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_ARTISTIQUE_COM'));

create policy "actualites : suppression SG/Président/Resp. com"
  on public.actualites for delete to authenticated
  using (public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_ARTISTIQUE_COM'));


-- =============================================================================
-- 10. STOCKAGE
--    avatars    : public,  chemin {user_id}/avatar.png
--    actualites : public,  écriture SG/Président
--    documents  : privé,   chemin libre (ex. {categorie}/{uuid}.pdf)
--    demandes   : privé,   chemin {user_id_du_demandeur}/{demande_id}.pdf
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',    'avatars',    true,  2097152,  array['image/png','image/jpeg','image/webp']),
  ('actualites', 'actualites', true,  5242880,  array['image/png','image/jpeg','image/webp']),
  ('documents',  'documents',  false, 52428800, null),
  ('demandes',   'demandes',   false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- ---------- avatars ----------
create policy "avatars : lecture publique"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars : upload dans son dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars : remplacement dans son dossier"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars : suppression dans son dossier"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars : photos du Bureau gérées par Président/Resp. com"
  on storage.objects for all to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = 'bureau'
         and public.a_role('PRESIDENT', 'RESP_ARTISTIQUE_COM'))
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = 'bureau'
              and public.a_role('PRESIDENT', 'RESP_ARTISTIQUE_COM'));

-- ---------- actualites ----------
create policy "actualites (fichiers) : lecture publique"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'actualites');

create policy "actualites (fichiers) : écriture SG/Président/Resp. com"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'actualites' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_ARTISTIQUE_COM'));

create policy "actualites (fichiers) : modification SG/Président/Resp. com"
  on storage.objects for update to authenticated
  using (bucket_id = 'actualites' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_ARTISTIQUE_COM'));

create policy "actualites (fichiers) : suppression SG/Président/Resp. com"
  on storage.objects for delete to authenticated
  using (bucket_id = 'actualites' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL', 'RESP_ARTISTIQUE_COM'));

-- ---------- documents ----------
create policy "documents (fichiers) : lecture Bureau"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.est_bureau());

create policy "documents (fichiers) : lecture membres si document visible"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.fichier_url = storage.objects.name
        and d.visibilite = 'MEMBRES'
    )
  );

create policy "documents (fichiers) : upload SG/Président"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "documents (fichiers) : modification SG/Président"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "documents (fichiers) : suppression SG/Président"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

-- ---------- demandes ----------
create policy "demandes (fichiers) : le membre télécharge les siens"
  on storage.objects for select to authenticated
  using (bucket_id = 'demandes'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "demandes (fichiers) : lecture SG/Président"
  on storage.objects for select to authenticated
  using (bucket_id = 'demandes' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "demandes (fichiers) : upload SG/Président"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'demandes' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "demandes (fichiers) : modification SG/Président"
  on storage.objects for update to authenticated
  using (bucket_id = 'demandes' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));

create policy "demandes (fichiers) : suppression SG/Président"
  on storage.objects for delete to authenticated
  using (bucket_id = 'demandes' and public.a_role('PRESIDENT', 'SECRETAIRE_GENERAL'));


-- =============================================================================
-- 11. REALTIME
--    Les abonnements postgres_changes respectent la RLS : un membre ne
--    reçoit jamais les messages du canal BUREAU.
-- =============================================================================
alter publication supabase_realtime add table public.messages;


-- =============================================================================
-- 12. DONNÉES D'AMORÇAGE — LE BUREAU 2026 + COMPTE ADMIN
--    Rôle = droits dans l'app ; poste = intitulé affiché.
--    Les vice-responsables ont les mêmes droits que leur responsable.
--    Photos : déposer les fichiers fournis dans Storage > avatars > bureau/
--    (les vice-responsables ajouteront la leur depuis "Mon profil").
--    Chaque personne s'inscrit avec son email ci-dessous, sans code d'invitation,
--    ou reçoit une invitation via Authentication > Users > "Invite user".
-- =============================================================================
insert into public.bureau_preconfigure (email, role, prenom, nom, poste, ordre, pole, avatar_url) values
  ('aymen.gladi@isiam.ma',                     'PRESIDENT',           'Aymen',            'Gladi',     'Président',                                          1,  null,            'bureau/aymen-gladi.jpg'),
  ('salma.ezzahi@universiapolis.ma',           'VICE_PRESIDENT',      'Salma',            'Ezzahi',    'Vice-présidente',                                    2,  null,            'bureau/salma-ezzahi.jpg'),
  ('salma.elkarmi@e-polytechnique.ma',         'SECRETAIRE_GENERAL',  'Salma',            'El Karmi',  'Secrétaire générale',                                3,  null,            'bureau/salma-elkarmi.jpg'),
  ('mounia.fouks@universiapolis.ma',           'SECRETAIRE_GENERAL',  'Mounia',           'Fouks',     'Vice-secrétaire générale',                           4,  null,            null),
  ('oumaima.ennouifi@e-polytechnique.ma',      'RH',                  'Oumaima',          'Ennouifi',  'Responsable des ressources humaines',                5,  null,            'bureau/oumaima-ennouifi.jpg'),
  ('safae.sanbi@universiapolis.ma',            'TRESORIER',           'Safae',            'Sanbi',     'Trésorière générale',                                7,  null,            'bureau/safae-sanbi.jpg'),
  ('fatimazahra.oubaali@universiapolis.ma',    'TRESORIER',           'Fatima Zahra',     'Oubaali',   'Vice-trésorière',                                    8,  null,            null),
  ('rida.bahtar@e-polytechnique.ma',           'RESP_ARTISTIQUE_COM', 'Reda',             'Bahter',    'Responsable artistique & communication',             9,  'COMMUNICATION', 'bureau/reda-bahter.jpg'),
  ('ikhlas.gouddam@universiapolis.ma',         'RESP_ARTISTIQUE_COM', 'Ikhlass',          'Gouddam',   'Vice-responsable artistique & communication',        10, 'COMMUNICATION', null),
  ('walid.maaloum@universiapolis.ma',          'RESP_RP_LOGISTIQUE',  'Walid',            'Maaloum',   'Responsable relations publiques & logistique',       11, 'LOGISTIQUE',    'bureau/walid-maaloum.jpg'),
  ('zakaria.indchelh@isiam.ma',                'RESP_RP_LOGISTIQUE',  'Zakaria',          'Indchelh',  'Vice-responsable relations publiques & logistique',  12, 'LOGISTIQUE',    null)
on conflict (email) do update set
  role = excluded.role, prenom = excluded.prenom, nom = excluded.nom,
  poste = excluded.poste, ordre = excluded.ordre, pole = excluded.pole,
  avatar_url = coalesce(public.bureau_preconfigure.avatar_url, excluded.avatar_url);

insert into public.bureau_preconfigure (email, role, prenom, nom, poste, ordre) values
  ('abdelmounaim.asemgar@suphdroit.ma', 'RH',    'Abdelmonaime', 'Asmgar',       'Vice-responsable des ressources humaines', 6),
  ('lesuniverscenesclub@gmail.com',     'ADMIN', 'Les Universcènes', 'Administration', 'Administrateur général du club', 0)
on conflict (email) do update set
  role = excluded.role, prenom = excluded.prenom, nom = excluded.nom,
  poste = excluded.poste, ordre = excluded.ordre;

-- Fin du script.
