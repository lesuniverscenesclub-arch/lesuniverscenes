-- =============================================================================
--  LES UNIVERSCÈNES — 00_reinitialiser.sql
--  Supprime tout ce que 01_schema_universcenes.sql a créé, pour pouvoir
--  relancer la version à jour du schéma.
--
--  ⚠ Efface les données de l'app (profils, tâches, messages, codes…).
--     À utiliser maintenant, tant que l'app n'est pas encore utilisée par le club.
--  Les photos déjà déposées dans Storage sont CONSERVÉES.
--
--  Ordre : 1) exécuter CE fichier   2) exécuter 01_schema_universcenes.sql
-- =============================================================================

-- 1. Triggers sur la table des comptes Supabase
drop trigger if exists on_auth_user_created       on auth.users;
drop trigger if exists on_auth_user_email_updated on auth.users;

-- 2. Règles de stockage créées par le schéma
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname like 'avatars :%'
        or policyname like 'actualites (fichiers)%'
        or policyname like 'documents (fichiers)%'
        or policyname like 'demandes (fichiers)%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- 3. Vues et tables (leurs règles RLS, index et triggers partent avec)
drop view  if exists public.v_taches_en_retard;
drop view  if exists public.v_taux_presence;
drop table if exists public.messages                 cascade;
drop table if exists public.actualites               cascade;
drop table if exists public.demandes_administratives cascade;
drop table if exists public.documents                cascade;
drop table if exists public.taches                   cascade;
drop table if exists public.presences                cascade;
drop table if exists public.evenements               cascade;
drop table if exists public.club_codes               cascade;
drop table if exists public.bureau_preconfigure      cascade;
drop table if exists public.users                    cascade;

-- 4. Fonctions
drop function if exists public.handle_new_user()                  cascade;
drop function if exists public.handle_user_email_change()         cascade;
drop function if exists public.proteger_users()                   cascade;
drop function if exists public.proteger_taches()                  cascade;
drop function if exists public.tracer_traitement_demande()        cascade;
drop function if exists public.tracer_presence()                  cascade;
drop function if exists public.generer_codes_invitation(int, int) cascade;
drop function if exists public.code_invitation_valide(text)       cascade;
drop function if exists public.bureau_public()                    cascade;
drop function if exists public.stats_president()                  cascade;
drop function if exists public.mon_role()                         cascade;
drop function if exists public.est_bureau()                       cascade;
do $$ begin
  if exists (select 1 from pg_type where typname = 'role_utilisateur' and typnamespace = 'public'::regnamespace) then
    execute 'drop function if exists public.a_role(variadic public.role_utilisateur[]) cascade';
  end if;
end $$;

-- 5. Types
drop type if exists public.role_utilisateur    cascade;
drop type if exists public.pole_club           cascade;
drop type if exists public.type_evenement      cascade;
drop type if exists public.statut_presence     cascade;
drop type if exists public.statut_tache        cascade;
drop type if exists public.priorite_tache      cascade;
drop type if exists public.categorie_document  cascade;
drop type if exists public.visibilite_document cascade;
drop type if exists public.type_document_admin cascade;
drop type if exists public.statut_demande      cascade;
drop type if exists public.canal_chat          cascade;

-- Terminé. Exécute maintenant 01_schema_universcenes.sql.
