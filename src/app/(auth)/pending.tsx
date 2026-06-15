import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function PendingScreen() {
  const { theme: t } = useTheme();
  const { signOut, refreshProfileStatus } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refreshProfileStatus();
    setChecking(false);
  };

  const s = styles(t);

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top', 'bottom']} style={s.inner}>

        {/* Logo */}
        <View style={s.logoBlock}>
          <View style={s.sunMark}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={[s.rayWrap, { transform: [{ rotate: `${i * 45}deg` }] }]}>
                <View style={s.ray} />
              </View>
            ))}
            <View style={s.sunCore} />
          </View>
          <Text style={s.clubName}>RONIN FIGHT TEAM</Text>
        </View>

        {/* Status */}
        <View style={s.statusBlock}>
          <View style={s.badge}>
            <Text style={s.badgeText}>EN ATTENTE</Text>
          </View>
          <Text style={s.heading}>Demande envoyée</Text>
          <Text style={s.body}>
            Ton profil a bien été reçu. Le coach va valider ton inscription sous peu.
            {'\n\n'}
            Tu recevras un accès dès validation.
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
              : <Text style={s.btnCheckText}>VÉRIFIER L'ÉTAT →</Text>
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

  logoBlock: { alignItems: 'center', gap: 10 },
  sunMark: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  rayWrap: {
    position: 'absolute', width: 60, height: 60,
    alignItems: 'center', justifyContent: 'flex-start',
  },
  ray: { width: 3, height: 15, backgroundColor: t.crimson, borderRadius: 2 },
  sunCore: { width: 18, height: 18, borderRadius: 9, backgroundColor: t.crimson },
  clubName: { fontSize: 18, fontWeight: '900', color: t.bone, letterSpacing: 3 },

  statusBlock: { gap: 16, alignItems: 'center' },
  badge: {
    backgroundColor: t.gold + '22', borderWidth: 1, borderColor: t.gold,
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: t.gold, letterSpacing: 2 },
  heading: { fontSize: 26, fontWeight: '900', color: t.bone, textAlign: 'center' },
  body: { fontSize: 15, color: t.textDim, textAlign: 'center', lineHeight: 22 },
  infoCard: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
    borderRadius: 4, padding: 16, gap: 8, width: '100%',
  },
  infoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  infoRowText: { fontSize: 13, color: t.textDim },

  actions: { gap: 12 },
  btnCheck: {
    backgroundColor: t.crimson, borderRadius: 4,
    paddingVertical: 15, alignItems: 'center',
  },
  btnCheckText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  signOut: { fontSize: 13, color: t.textMute, textAlign: 'center', textDecorationLine: 'underline' },
});
