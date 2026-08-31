import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Radii } from '@/constants/theme';

export default function PendingScreen() {
  const { theme: t } = useTheme();
  const { user, signOut, refreshProfileStatus } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    const refreshedUser = await refreshProfileStatus();
    setChecking(false);
    if (refreshedUser?.status === 'approved' || refreshedUser?.role === 'coach' || refreshedUser?.role === 'admin') {
      router.replace('/(tabs)/accueil');
    }
  };

  const s = useMemo(() => styles(t), [t]);
  const rejected = user?.status === 'rejected';

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top', 'bottom']} style={s.inner}>

        {/* Logo */}
        <View style={s.logoBlock}>
          <Image
            accessibilityLabel="Logo Ronin Fight Team"
            contentFit="contain"
            source={require('../../../assets/images/rft-mark.png')}
            style={s.logo}
          />
        </View>

        {/* Status */}
        <View style={s.statusBlock}>
          <View style={[s.badge, rejected && s.badgeRejected]}>
            <Text style={[s.badgeText, rejected && s.badgeTextRejected]}>{rejected ? 'NON RETENUE' : 'EN ATTENTE'}</Text>
          </View>
          <Text style={s.heading}>{rejected ? 'Demande non retenue' : 'Demande envoyée'}</Text>
          <Text style={s.body}>
            {rejected
              ? 'Le club n’a pas pu valider ta demande pour le moment. Contacte le coach si tu souhaites obtenir plus d’informations.'
              : 'Ton email est confirmé et ton profil a bien été reçu. Le coach va maintenant valider ton inscription.\n\nTu recevras une notification dès que ton accès sera ouvert.'}
          </Text>

          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={14} color={s.infoRowText.color as string} />
              <Text style={s.infoRowText}>Ronin Fight Team · Montataire, Oise</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="mail-outline" size={14} color={s.infoRowText.color as string} />
              <Text style={s.infoRowText}>contact@roninbjj.fr</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <Pressable
            style={[s.btnCheck, checking && { opacity: 0.6 }]}
            onPress={handleCheck}
            disabled={checking}
          >
            {checking
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.btnCheckText}>ACTUALISER MON STATUT →</Text>
            }
          </Pressable>

          <Pressable onPress={signOut}>
            <Text style={s.signOut}>Se déconnecter</Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 24 },

  logoBlock: { alignItems: 'center' },
  logo: { width: 170, height: 141 },

  statusBlock: { gap: 16, alignItems: 'center' },
  badge: {
    backgroundColor: t.gold + '22', borderWidth: 1, borderColor: t.gold,
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: t.gold, letterSpacing: 2 },
  badgeRejected: { backgroundColor: t.crimson + '22', borderColor: t.crimson },
  badgeTextRejected: { color: t.crimson },
  heading: { fontSize: 26, fontWeight: '900', color: t.bone, textAlign: 'center' },
  body: { fontSize: 15, color: t.textDim, textAlign: 'center', lineHeight: 22 },
  infoCard: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
    borderRadius: Radii.lg, padding: 16, gap: 8, width: '100%',
  },
  infoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  infoRowText: { fontSize: 13, color: t.textDim },

  actions: { gap: 12 },
  btnCheck: {
    minHeight: 50, backgroundColor: t.crimson, borderRadius: Radii.md,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
  },
  btnCheckText: { fontSize: 13, fontWeight: '900', color: t.onAccent, letterSpacing: 2 },
  signOut: { fontSize: 13, color: t.textMute, textAlign: 'center', textDecorationLine: 'underline' },
});
