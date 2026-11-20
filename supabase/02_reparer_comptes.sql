-- =============================================================================
--  LES UNIVERSCÈNES — 02_reparer_comptes.sql
--  Pour les comptes créés AVANT l'exécution du schéma (ou avant une remise à zéro) :
--  ils existent dans Authentication > Users mais n'ont pas de profil dans l'app.
--  Sans risque : peut être relancé autant de fois que nécessaire.
-- =============================================================================

-- 1. Crée le profil manquant des comptes du Bureau et de l'admin (rôle, poste, photo)
insert into public.users (id, email, nom, prenom, role, pole, poste, ordre_bureau, avatar_url)
select u.id, lower(u.email), b.nom, b.prenom, b.role, b.pole, b.poste, b.ordre, b.avatar_url
from auth.users u
join public.bureau_preconfigure b on b.email = lower(u.email)
where not exists (select 1 from public.users p where p.id = u.id);

update public.bureau_preconfigure b
set active_le = coalesce(b.active_le, now())
where exists (select 1 from public.users p where p.email = b.email);

-- 2. Confirme l'email de l'admin et du Bureau (si le lien de confirmation a expiré)
update auth.users u
set email_confirmed_at = now()
where u.email_confirmed_at is null
  and lower(u.email) in (select email from public.bureau_preconfigure);

-- 3. Vérification : chaque compte et son rôle dans l'app
select u.email,
       p.role,
       p.poste,
       case when u.email_confirmed_at is null then 'non confirmé' else 'confirmé' end as email,
       case when p.id is null then '⚠ SANS PROFIL' else 'ok' end as profil
from auth.users u
left join public.users p on p.id = u.id
order by p.ordre_bureau nulls last, u.email;
