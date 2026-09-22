import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { safeBack } from '@/lib/navigation';

const UPDATED_AT = '22 septembre 2026';

const DOCUMENTS = {
  terms: {
    title: 'CONDITIONS D’UTILISATION',
    sections: [
      ['Objet', 'L’application Ronin Fight Team est réservée aux membres du club. Elle permet de consulter les annonces, le calendrier et les compétitions, de communiquer dans les salons et d’organiser des covoiturages.'],
      ['Accès au service', 'La création d’un compte ne donne pas un accès immédiat. Un coach doit valider l’adhésion. Les identifiants sont personnels et ne doivent pas être partagés.'],
      ['Règles de conduite', 'Chaque membre s’engage à publier des contenus respectueux, utiles à la vie du club et conformes à la loi. Le staff peut modérer un contenu ou suspendre un accès en cas d’abus.'],
      ['Covoiturage', 'Le service facilite la mise en relation entre membres. Les conducteurs et passagers restent responsables de leurs accords, de leur assurance et du respect du code de la route.'],
      ['Disponibilité', 'Le club s’efforce de maintenir le service accessible, sans garantir une disponibilité permanente. Des interruptions peuvent avoir lieu pour maintenance ou raisons techniques.'],
      ['Suppression et départ', 'Un membre peut quitter le club ou supprimer définitivement son compte depuis les paramètres. La suppression efface le compte et les contenus directement rattachés lorsque leur conservation n’est pas nécessaire.'],
    ],
  },
  privacy: {
    title: 'POLITIQUE DE CONFIDENTIALITÉ',
    sections: [
      ['Responsable', 'Ronin Fight Team est responsable du traitement des données utilisées par cette application. Toute demande peut être envoyée à roninft.contact@gmail.com.'],
      ['Données traitées', 'L’application traite les informations du profil (nom, adresse email, téléphone, catégorie, grade), les messages échangés dans les salons, les inscriptions aux cours et compétitions, les résultats sportifs, les trajets de covoiturage, les préférences d’affichage et les identifiants techniques nécessaires aux notifications.'],
      ['Finalités', 'Ces données servent exclusivement à gérer les membres, organiser les activités du club, permettre les échanges internes et envoyer les notifications demandées.'],
      ['Accès et visibilité', 'L’accès est limité aux membres validés et au staff. Les réglages permettent de réduire la visibilité du profil, du grade et du palmarès.'],
      ['Sous-traitants', 'Pour fonctionner, l’application confie certaines données à des prestataires techniques, sans leur en transférer la propriété : Neon (hébergement de la base de données, Union européenne), Fly.io (hébergement de l’API, région de Paris), Resend (envoi des emails de vérification et de réinitialisation de mot de passe), Expo et Apple Push Notification service (acheminement des notifications). Lorsque le stockage d’images est activé, les photos de profil sont hébergées chez un fournisseur de stockage objet compatible S3.'],
      ['Conservation et sécurité', 'Les données sont conservées pendant la durée nécessaire à la vie du compte et protégées par des contrôles d’accès. Les mots de passe sont stockés sous forme de condensats sécurisés et ne sont jamais lisibles par le club.'],
      ['Vos droits', 'Vous pouvez modifier vos informations, quitter le club ou supprimer définitivement votre compte depuis l’application, dans Réglages. Pour exercer un droit d’accès, de rectification, d’effacement ou d’opposition, écrivez à roninft.contact@gmail.com. Vous pouvez également introduire une réclamation auprès de la CNIL.'],
    ],
  },
} as const;

export default function LegalScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { document } = useLocalSearchParams<{ document?: string }>();
  const content = document === 'privacy' ? DOCUMENTS.privacy : DOCUMENTS.terms;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/settings')} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>INFORMATIONS LÉGALES</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.updated}>MISE À JOUR · {UPDATED_AT.toUpperCase()}</Text>
        {content.sections.map(([title, body]) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: t.hairline },
    backBtn: { padding: 4, width: 36 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    headerTitle: { fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900', letterSpacing: 1.5 },
    scroll: { padding: 22 },
    title: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 32, color: t.bone, fontWeight: '900', marginBottom: 8 },
    updated: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.2, marginBottom: 24 },
    section: { borderTopWidth: 1, borderTopColor: t.hairline, paddingVertical: 18, gap: 8 },
    sectionTitle: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, fontWeight: '700', letterSpacing: 1.5 },
    body: { fontFamily: FONTS.body, fontSize: 14, color: t.text, lineHeight: 22 },
  });
}
