import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { authClient } from '@/lib/auth-client';

export default function VerifyScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { email, error } = useLocalSearchParams<{ email?: string; error?: string }>();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(error ? 'Le lien est invalide ou expiré.' : 'Ton adresse email est vérifiée.');

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
      <Text style={styles.title}>{error ? 'LIEN INVALIDE' : 'EMAIL VÉRIFIÉ'}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.primary} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.primaryText}>REVENIR À LA CONNEXION</Text>
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
  primary: { width: '100%', backgroundColor: t.crimson, padding: 15, borderRadius: 4, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1.4 },
  secondary: { width: '100%', borderWidth: 1, borderColor: t.hairlineStrong, padding: 14, borderRadius: 4, alignItems: 'center' },
  secondaryText: { color: t.bone, fontWeight: '700', letterSpacing: 1.2 },
});
