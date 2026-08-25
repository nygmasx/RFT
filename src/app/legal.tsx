import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailHeader } from '@/components/ui/rft-ui';
import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { safeBack } from '@/lib/navigation';

const UPDATED_AT = '12 août 2026';

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
      ['Responsable', 'Ronin Fight Team est responsable du traitement des données utilisées par cette application. Toute demande peut être envoyée à contact@roninbjj.fr.'],
      ['Données traitées', 'L’application traite les informations du profil, les messages, inscriptions, grades, résultats sportifs, covoiturages, préférences et identifiants techniques nécessaires aux notifications.'],
      ['Finalités', 'Ces données servent exclusivement à gérer les membres, organiser les activités du club, permettre les échanges internes et envoyer les notifications demandées.'],
      ['Accès et visibilité', 'L’accès est limité aux membres validés et au staff. Les réglages permettent de réduire la visibilité du profil, du grade et du palmarès.'],
      ['Conservation et sécurité', 'Les données sont conservées pendant la durée nécessaire à la vie du compte et protégées par des contrôles d’accès. Les mots de passe sont stockés sous forme de condensats sécurisés et ne sont jamais lisibles par le club.'],
      ['Vos droits', 'Vous pouvez modifier vos informations, quitter le club ou supprimer votre compte depuis l’application. Pour exercer un droit d’accès, de rectification, d’effacement ou d’opposition, écrivez à contact@roninbjj.fr.'],
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
        <DetailHeader eyebrow={`Mise à jour · ${UPDATED_AT}`} title="INFORMATIONS LÉGALES" onBack={() => safeBack('/settings')} />
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.updated}>MISE À JOUR · {UPDATED_AT.toUpperCase()}</Text>
        <Text style={styles.notice}>Document d’information à faire valider par le responsable légal du club avant publication publique.</Text>
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
    notice: { fontFamily: FONTS.body, fontSize: 12, color: t.gold, lineHeight: 18, marginBottom: 18 },
    section: { borderTopWidth: 1, borderTopColor: t.hairline, paddingVertical: 18, gap: 8 },
    sectionTitle: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, fontWeight: '700', letterSpacing: 1.5 },
    body: { fontFamily: FONTS.body, fontSize: 14, color: t.text, lineHeight: 22 },
  });
}
