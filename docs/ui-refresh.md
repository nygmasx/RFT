# Refonte UI/UX — direction « Ronin Editorial »

## Audit rapide

L’application possède une identité sombre cohérente et une bonne densité fonctionnelle, mais la hiérarchie est trop uniforme : presque tous les écrans emploient les mêmes titres en capitales, les mêmes cartes très anguleuses et de nombreux libellés monospace de petite taille. Les actions secondaires ont parfois des cibles tactiles inférieures à 44 px. Plusieurs listes ne distinguent pas clairement les états vides, et les cartes importantes ne se démarquent pas assez des cartes utilitaires.

La navigation principale est fonctionnelle mais ressemble à une barre technique collée au bord de l’écran. Elle manque d’un conteneur visuel, d’un état actif explicite et d’informations d’accessibilité complètes. L’Accueil donne accès aux bons contenus, mais le parcours visuel est fragmenté. Compétitions affiche les données essentielles, mais ses dates, statuts et actions sont trop proches visuellement.

## Direction

« Ronin Editorial » combine l’énergie d’une affiche de combat et la précision d’un tableau de bord sportif. Le décor reste sombre, calme et matériel. Le rouge est réservé aux actions et informations prioritaires ; l’or signale le résultat et la performance. Les formes plus généreuses apportent le niveau de finition attendu sans effacer la personnalité du club.

Principes :

- **Une information dominante par écran.** Grand titre, contenu prioritaire immédiatement identifiable, actions périphériques plus discrètes.
- **Le rouge guide, il ne décore pas.** Il marque l’état actif, les actions et les urgences.
- **Des surfaces en couches.** Fond sumi, cartes graphite, surfaces élevées et filets fins créent la profondeur sans ombres coûteuses.
- **Des cartes spécialisées.** Une carte éditoriale ne ressemble pas à une ligne d’agenda ; une compétition n’est pas une simple liste.
- **Le mouvement confirme l’action.** Retours haptiques courts et micro-transitions natives ; aucune animation ne bloque le contenu.

## Mini design system

### Couleurs

- `ink` : fond principal.
- `surface` : carte standard.
- `elevated` : contrôle actif ou sous-surface.
- `bone` / `text` : texte principal ivoire.
- `textDim` / `textMute` : hiérarchie secondaire.
- `crimson` : action, sélection, priorité.
- `onAccent` / `onAccentMuted` : contenu lisible sur une surface rouge, indépendamment du thème.
- `gold` : classement, médaille, résultat.
- `success`, `warning`, `info` : états sémantiques partagés.

Les thèmes existants sont conservés. Les couleurs sémantiques sont définies dans chaque thème, jamais codées écran par écran.

### Typographie

- Display : 44 px, très gras, interlettrage serré pour les titres d’écran.
- Titre de section : 18–22 px, très gras.
- Corps : 14–16 px avec support du redimensionnement système.
- Label : 11–12 px.
- Mono : 9–10 px uniquement pour les métadonnées courtes, dates et catégories.

### Grille, rayons et élévation

- Grille de base : 4 px.
- Gouttière mobile : 20 px.
- Espacement courant : 8 / 12 / 16 / 20 / 24 / 32 px.
- Rayons : 6 / 10 / 14 / 20 / 26 px ; pilules à rayon maximal.
- Élévation : contraste de surface + bordure semi-transparente. Les ombres restent rares pour préserver performance et cohérence Android/web.

### Interaction, accessibilité et motion

- Cible tactile minimale : 44 × 44 px.
- Boutons iconiques avec rôle et libellé d’accessibilité.
- Onglets avec rôle `tab`, état `selected` et libellé lisible.
- Dynamic Type conservé ; réduction contrôlée uniquement pour les très grands titres sur une ligne.
- États loading, empty et statut métier explicitement représentés.
- Haptique de sélection sur navigation et changement d’onglet, désactivé sur le web.
- Durées de référence : 140 ms (feedback), 220 ms (transition), 320 ms (mise en scène).

## Périmètre de la tranche 1

- Tokens étendus dans `src/constants/theme.ts`.
- Primitives partagées dans `src/components/ui/rft-ui.tsx`.
- Navigation principale flottante et accessible.
- Accueil membre : header, carte éditoriale, accès club, agenda, classement et salons.
- Compétitions membre : en-tête, filtres, cartes, états vides, inscriptions et résultats.

Les flux coach restent fonctionnels et bénéficient de la nouvelle navigation. Leur migration complète vers les primitives partagées est prévue dans un lot suivant.

## Périmètre de la tranche 2 — Conversations

- Salons : recherche, état de chargement, état vide, salon principal éditorial, liste secondaire et modération coach.
- Messages : en-tête contextualisé, bulles, réponses, sondages, vocaux, réactions, états vide/non-lu/lecture seule et composeur flottant.
- Contraste multi-thème : tous les contenus sur l’accent emploient désormais `onAccent`, notamment dans le thème clair.
- Navigation et contrats métier inchangés : les mêmes routes, hooks, appels API et capacités de modération sont conservés.

La règle de migration pour les lots suivants est de remplacer les styles d’accent locaux par les tokens sémantiques, puis de composer les écrans avec les mêmes surfaces, rayons, cibles tactiles et états partagés. Les prochains lots proposés sont Profil/activité, calendrier/covoiturage, puis parcours coach et administration.

## Périmètre de la tranche 3 — Profil et activité

- Profil : carte membre éditoriale, avatar, métadonnées sportives, grade BJJ, progression de ceinture, accès rapides, synthèse du palmarès et réglages.
- Activité : synthèse compétitive, taux de podium, répartition des médailles, historique et statuts de validation des résultats.
- `DetailHeader` rejoint les primitives partagées pour les futurs écrans secondaires avec retour, contexte et action.
- Les statistiques affichées proviennent exclusivement du profil et du palmarès existants. Les données non exposées par le backend ne sont pas simulées.

Le prochain lot porte sur le calendrier et les covoiturages, puis sur les parcours coach et administration.

## Périmètre de la tranche 4 — Calendrier et mobilité

- Calendrier : navigation mensuelle, grille lisible, sélection du jour, événements regroupés et état vide dédié.
- Covoiturage : aperçu éditorial des trajets, filtres, places disponibles, création et gestion de ses propositions.
- Les calculs de calendrier et les filtrages de listes sont mémorisés ou regroupés pour éviter les parcours répétés au rendu.
- Les routes, permissions, inscriptions et coordonnées de contact existantes sont conservées.

## Périmètre de la tranche 5 — Parcours membre

- Club public et espace club, annonces, notifications, classements, palmarès et détails de compétition.
- Formulaires profil, ceinture, résultat, salon et covoiturage alignés sur les mêmes surfaces, rayons et cibles tactiles.
- Authentification harmonisée : connexion, inscription, vérification, attente et réinitialisation du mot de passe.
- L'ancien écran de démonstration Expo redirige désormais vers l'Accueil afin de ne plus exposer de contenu starter.

## Périmètre de la tranche 6 — Coach et administration

- Tableau de bord coach, gestion du club, contenus, résultats et timer.
- Hiérarchie, entêtes secondaires et actions rendus cohérents avec les écrans membre.
- Les contrôles de rôle, mutations et contrats API restent inchangés.

## Validation de la tranche

- TypeScript et ESLint côté application.
- TypeScript et tests unitaires côté serveur.
- Export web Expo pour vérifier la compatibilité du bundle.
- Suite d'intégration sur PostgreSQL isolé couvrant les parcours d'authentification, club, compétitions, calendrier, covoiturage, conversations, notifications et médias.
- Contrôle visuel iOS en thèmes sombre et clair sur les écrans principaux ; captures conservées dans `artifacts/ui-refresh/`.

## Dépendances de production restantes

Le backend de production répond et les données publiques sont accessibles. L'envoi réel des e-mails de vérification et de réinitialisation exige toutefois `RESEND_API_KEY` et `EMAIL_FROM`, absents de la configuration Fly au moment de cette tranche. Les parcours applicatifs et les jetons sont testés, mais la livraison externe des e-mails ne peut pas être déclarée opérationnelle sans ces secrets.

Le stockage S3 reste optionnel : en l'absence de secrets `S3_*`, les avatars et médias utilisent le stockage de repli en base déjà prévu par le serveur. Ce mode fonctionne dans les tests d'intégration, mais un stockage objet reste recommandé avant une montée en charge.
