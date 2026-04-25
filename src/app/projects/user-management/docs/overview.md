# Gestion utilisateurs — Vue d'ensemble

## Quoi

Mini-app d'administration des comptes utilisateurs de maisonnoapp.

## Fonctionnalités

- **Liste des utilisateurs** — affiche tous les comptes Supabase Auth avec leur profil
- **Créer un utilisateur** — invite par email (l'utilisateur reçoit un lien pour définir son mot de passe)
- **Détail utilisateur** — édition du prénom, nom, rôle et accès aux applications
- **Réinitialisation mot de passe** — envoie un email de reset à l'utilisateur sélectionné
- **Contrôle d'accès** — la page d'accueil ne montre que les apps autorisées pour chaque user

## Accès

Réservé aux **admins**. Un non-admin est redirigé vers `/` à l'accès direct.

## Rôles

| Rôle | Description |
|------|-------------|
| `admin` | Accès à toutes les applications, accès à la gestion utilisateurs |
| `user` | Accès uniquement aux applications listées dans `app_access` |
