import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { FONTS, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { authClient } from '@/lib/auth-client';

export default function VerifyScreen() {
  const { theme: t } = useTheme();
  const { user, refreshProfileStatus } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { email, error } = useLocalSearchParams<{ email?: string; error?: string }>();
  const [sending, setSending] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [message, setMessage] = useState(error ? 'Le lien est invalide ou expiré.' : 'Ton adresse email est vérifiée.');

  const continueRegistration = async () => {
    setContinuing(true);
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    const refreshedUser = await refreshProfileStatus();
    if (refreshedUser?.status === 'approved' || refreshedUser?.role === 'coach' || refreshedUser?.role === 'admin') {
      router.replace('/(tabs)/accueil');
    } else {
      router.replace('/(auth)/pending');
    }
  };

  const resend = async () => {
    if (!email) return setMessage('Reconnecte-toi pour renvoyer un lien.');
    setSending(true);
    const result = await authClient.sendVerificationEmail(email);
    setSending(false);
    setMessage(result.error ? result.error.message : 'Un nouveau lien a été envoyé.');
  };

  return <View style={styles.container}><SafeAreaView style={styles.safe}>
    <View style={styles.content}>
      <Ionicons name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={64} color={error ? t.crimson : t.gold} />
      <Text style={styles.title}>{error ? 'LIEN INVALIDE' : 'EMAIL CONFIRMÉ'}</Text>
      <Text style={styles.message}>{error ? message : 'Première étape terminée. Ta demande doit maintenant être validée par le coach avant l’ouverture de ton accès.'}</Text>
      <Pressable style={[styles.primary, continuing && styles.disabled]} disabled={continuing} onPress={() => void continueRegistration()}>
        {continuing
          ? <ActivityIndicator color={t.onAccent} />
          : <Text style={styles.primaryText}>{user ? 'SUIVRE MA DEMANDE' : 'ME CONNECTER'}</Text>}
      </Pressable>
      {(email || error) && <Pressable style={styles.secondary} onPress={resend} disabled={sending}>
        {sending ? <ActivityIndicator color={t.bone} /> : <Text style={styles.secondaryText}>RENVOYER UN LIEN</Text>}
      </Pressable>}
    </View>
  </SafeAreaView></View>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink }, safe: { flex: 1, padding: 28 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 },
  title: { color: t.bone, fontFamily: FONTS.display, fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  message: { color: t.textDim, textAlign: 'center', fontSize: 14, lineHeight: 21 },
  primary: { width: '100%', minHeight: 50, backgroundColor: t.crimson, padding: 15, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.65 },
  primaryText: { color: t.onAccent, fontWeight: '900', letterSpacing: 1.4 },
  secondary: { width: '100%', minHeight: 50, borderWidth: 1, borderColor: t.hairlineStrong, padding: 14, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: t.bone, fontWeight: '700', letterSpacing: 1.2 },
});
