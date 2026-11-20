# Les Universcènes App

Application web installable (PWA) du club Théâtre & Cinéma Universiapolis.
Next.js 16 · Tailwind CSS 4 · Supabase · Lucide.

## Ce que contient cette version (étape 2)

- Page d'accueil publique : pôles, **Notre Bureau** (photos depuis Supabase), actualités, YouTube, Instagram.
- **Connexion / inscription** : membres avec code d'invitation, Bureau avec leur email (sans code).
- Mot de passe oublié + nouveau mot de passe.
- **App installable** sur Android et iPhone. Sur téléphone, l'espace membres n'est accessible
  que depuis l'app installée (écran « Installe l'app pour continuer »).
- **Navigation selon le rôle** : barre latérale sur ordinateur, barre du bas sur téléphone.
  Les sections du Bureau n'apparaissent jamais pour un membre, et leurs adresses renvoient une 404.
- Tableau de bord (présence, tâches, événements ; statistiques pour Président / VP / Admin).
- **Mon profil** : modifier ses infos, **ajouter / changer / retirer sa photo** (appareil photo ou galerie).
- **Codes d'invitation** (RH, Président, Admin) : générer, copier, envoyer par WhatsApp.

Les autres pages (planning, tâches, chat, guichet, appel…) affichent « bientôt disponible »
et seront codées aux étapes suivantes. Leur protection par rôle est déjà active.

## Installation

### 1. Supabase
1. Créer un projet sur https://supabase.com (région Europe).
2. **SQL Editor** → coller `01_schema_universcenes.sql` → **Run** (sur un projet neuf).
3. **Storage** → bucket `avatars` → dossier `bureau` → y déposer les photos de `photos_bureau.zip`.
4. **Authentication → Sign In / Providers → Email** : laisser « Confirm email » activé.
5. **Project Settings → API** : copier la *Project URL* et la clé *anon public*.

### 2. En local
```bash
npm install
cp .env.example .env.local     # puis remplir les valeurs Supabase
npm run dev                    # http://localhost:3000
```
Pour tester l'écran d'installation sur ordinateur, ouvrir les outils de développement en mode téléphone.
Mettre `NEXT_PUBLIC_EXIGER_INSTALLATION=false` pour désactiver le blocage pendant les tests.

### 3. Mise en ligne (Vercel)
1. Envoyer le dossier sur GitHub.
2. Vercel → *Add New Project* → choisir le dépôt.
3. *Environment Variables* : les mêmes que `.env.local`
   (avec `NEXT_PUBLIC_SITE_URL=https://votre-adresse.vercel.app`).
4. *Deploy*.
5. Supabase → **Authentication → URL Configuration** :
   - *Site URL* : `https://votre-adresse.vercel.app`
   - *Redirect URLs* : `https://votre-adresse.vercel.app/**`

### 4. Premiers comptes
- **Admin général** : `lesuniverscenesclub@gmail.com` → « Inscription » sans code. Rôle ADMIN : tous les droits.
  Personne d'autre (même le Président) ne peut lui retirer ce rôle.
- **Bureau** : chacun s'inscrit avec l'email de la liste, sans code → rôle, poste et photo automatiques.
- **Membres** : la RH génère des codes dans *Codes d'invitation* et les envoie.

## Organisation du code

```
app/
  page.tsx                  Accueil public
  connexion/                Connexion + inscription
  mot-de-passe/             Mot de passe oublié / nouveau
  installer/                Écran d'installation
  auth/callback|deconnexion Liens email, déconnexion
  espace/                   Espace connecté (protégé)
    layout.tsx              Barre latérale / barre du bas selon le rôle
    page.tsx                Tableau de bord
    profil/                 Mon profil + photo
    bureau/                 Onglet « Bureau » (mobile)
    rh/codes/               Codes d'invitation
    [...section]/           Pages à venir (déjà protégées par rôle)
  manifest.ts               Manifest de l'app installable
components/                 Interface (nav, pwa, auth, profil, rh)
lib/
  roles.ts                  Rôles, droits et menus  ← miroir des règles SQL
  auth.ts                   requireProfil / requireRole
  supabase/                 Clients Supabase (navigateur, serveur, proxy)
proxy.ts                    Session + protection de /espace
public/sw.js, icons/        Service worker et icônes de l'app
```

**Sécurité :** l'interface masque ce qu'un rôle ne doit pas voir, mais la vraie protection est dans
la base (RLS). Même en contournant l'app, un membre ne peut ni lire ni modifier les données du Bureau.
