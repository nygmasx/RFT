// Canonical legal text served publicly at /privacy, /terms and /support.
// App Store Connect requires reachable URLs for these, and the in-app screen
// (src/app/legal.tsx) mirrors the same sections.

export const LEGAL_UPDATED_AT = '22 septembre 2026';

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'roninft.contact@gmail.com';

export type LegalDocument = {
  slug: 'privacy' | 'terms' | 'support' | 'account-deletion';
  title: string;
  intro?: string;
  sections: [string, string][];
};

export const TERMS: LegalDocument = {
  slug: 'terms',
  title: 'Conditions d’utilisation',
  sections: [
    ['Objet', 'L’application Ronin Fight Team est réservée aux membres du club. Elle permet de consulter les annonces, le calendrier et les compétitions, de communiquer dans les salons et d’organiser des covoiturages.'],
    ['Accès au service', 'La création d’un compte ne donne pas un accès immédiat. Un coach doit valider l’adhésion. Les identifiants sont personnels et ne doivent pas être partagés.'],
    ['Règles de conduite', 'Chaque membre s’engage à publier des contenus respectueux, utiles à la vie du club et conformes à la loi. Le staff peut modérer un contenu ou suspendre un accès en cas d’abus.'],
    ['Covoiturage', 'Le service facilite la mise en relation entre membres. Les conducteurs et passagers restent responsables de leurs accords, de leur assurance et du respect du code de la route.'],
    ['Disponibilité', 'Le club s’efforce de maintenir le service accessible, sans garantir une disponibilité permanente. Des interruptions peuvent avoir lieu pour maintenance ou raisons techniques.'],
    ['Suppression et départ', 'Un membre peut quitter le club ou supprimer définitivement son compte depuis les paramètres de l’application. La suppression efface le compte et les contenus directement rattachés lorsque leur conservation n’est pas nécessaire.'],
  ],
};

export const PRIVACY: LegalDocument = {
  slug: 'privacy',
  title: 'Politique de confidentialité',
  sections: [
    ['Responsable', `Ronin Fight Team est responsable du traitement des données utilisées par cette application. Toute demande peut être envoyée à ${SUPPORT_EMAIL}.`],
    ['Données traitées', 'L’application traite les informations du profil (nom, adresse email, téléphone, catégorie, grade), les messages échangés dans les salons, les inscriptions aux cours et compétitions, les résultats sportifs, les trajets de covoiturage, les préférences d’affichage et les identifiants techniques nécessaires aux notifications.'],
    ['Finalités', 'Ces données servent exclusivement à gérer les membres, organiser les activités du club, permettre les échanges internes et envoyer les notifications demandées. Elles ne sont ni vendues, ni utilisées à des fins publicitaires, ni exploitées pour du suivi entre applications.'],
    ['Accès et visibilité', 'L’accès est limité aux membres validés et au staff. Les réglages de l’application permettent de réduire la visibilité du profil, du grade et du palmarès.'],
    ['Sous-traitants', 'Pour fonctionner, l’application confie certaines données à des prestataires techniques, sans leur en transférer la propriété : Neon (hébergement de la base de données, Union européenne), Fly.io (hébergement de l’API, région de Paris), Resend (envoi des emails de vérification et de réinitialisation de mot de passe), Expo et Apple Push Notification service (acheminement des notifications). Lorsque le stockage d’images est activé, les photos de profil sont hébergées chez un fournisseur de stockage objet compatible S3.'],
    ['Conservation et sécurité', 'Les données sont conservées pendant la durée nécessaire à la vie du compte et protégées par des contrôles d’accès. Les mots de passe sont stockés sous forme de condensats sécurisés et ne sont jamais lisibles par le club.'],
    ['Vos droits', `Vous pouvez modifier vos informations, quitter le club ou supprimer définitivement votre compte directement depuis l’application, dans Réglages. Pour exercer un droit d’accès, de rectification, d’effacement ou d’opposition, écrivez à ${SUPPORT_EMAIL}. Vous pouvez également introduire une réclamation auprès de la CNIL.`],
  ],
};

export const SUPPORT: LegalDocument = {
  slug: 'support',
  title: 'Assistance',
  intro: 'Une question sur l’application Ronin Fight Team, un bug à signaler ou une demande concernant vos données ?',
  sections: [
    ['Nous contacter', `Écrivez à ${SUPPORT_EMAIL}. Nous répondons sous quelques jours ouvrés.`],
    ['Accès à l’application', 'L’application est réservée aux membres du club. Après l’inscription, un coach valide l’adhésion : tant que la validation n’a pas eu lieu, l’accès reste en attente. Si l’attente se prolonge, contactez le staff directement au dojo ou par email.'],
    ['Mot de passe oublié', 'Depuis l’écran de connexion, utilisez « Mot de passe oublié ». Un email contenant un lien de réinitialisation est envoyé à l’adresse du compte. Pensez à vérifier les courriers indésirables.'],
    ['Supprimer son compte', 'La suppression définitive se fait dans l’application : Réglages, puis « Supprimer mon compte ». L’opération efface le compte et les contenus qui y sont rattachés.'],
    ['Le club', 'Ronin Fight Team — Montataire, Oise.'],
  ],
};

// Google Play's Data safety form requires a publicly reachable URL where a user
// can request account and data deletion, separate from the in-app path.
export const ACCOUNT_DELETION: LegalDocument = {
  slug: 'account-deletion',
  title: 'Supprimer son compte',
  intro: 'Comment supprimer définitivement votre compte Ronin Fight Team et les données qui y sont rattachées.',
  sections: [
    ['Depuis l’application', 'Ouvrez l’application, allez dans Réglages, puis « Supprimer mon compte ». La suppression vous est demandée en confirmation, puis appliquée immédiatement. C’est le moyen le plus rapide.'],
    ['Sans passer par l’application', `Si vous n’avez plus accès à l’application, écrivez à ${SUPPORT_EMAIL} depuis l’adresse email de votre compte, en demandant la suppression. Nous traitons la demande sous 30 jours au plus.`],
    ['Ce qui est supprimé', 'Votre compte, votre profil, vos photos, vos préférences, vos inscriptions aux cours et compétitions, vos trajets de covoiturage, vos grades et résultats enregistrés, ainsi que vos jetons de notification. Vos messages dans les salons du club sont supprimés avec le compte.'],
    ['Ce qui peut être conservé', 'Les données que le club doit garder pour une obligation légale ou comptable, par exemple un justificatif de paiement de cotisation, sont conservées le temps imposé par cette obligation, puis effacées. Elles ne sont plus rattachées à un compte actif.'],
    ['Délai', 'La suppression depuis l’application est immédiate. Une demande envoyée par email est traitée sous 30 jours au maximum.'],
  ],
};

export const DOCUMENTS: Record<LegalDocument['slug'], LegalDocument> = {
  'account-deletion': ACCOUNT_DELETION,
  privacy: PRIVACY,
  terms: TERMS,
  support: SUPPORT,
};
