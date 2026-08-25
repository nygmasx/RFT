import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { FONTS, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!email.trim()) return setMessage('Saisis ton adresse email.');
    setLoading(true);
    await authClient.requestPasswordReset(email.trim().toLowerCase());
    setLoading(false);
    setMessage('Si ce compte existe, un lien vient d’être envoyé.');
  };

  return <View style={styles.container}><SafeAreaView style={styles.safe}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
    <FormScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>MOT DE PASSE OUBLIÉ</Text>
      <Text style={styles.copy}>Reçois un lien sécurisé pour choisir un nouveau mot de passe.</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="ton@email.fr"
        placeholderTextColor={t.textMute} keyboardType="email-address" autoCapitalize="none" />
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ENVOYER LE LIEN</Text>}
      </Pressable>
    </FormScrollView>
  </SafeAreaView></View>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink }, safe: { flex: 1, padding: 24 },
  back: { color: t.bone, fontSize: 34 }, content: { flexGrow: 1, justifyContent: 'center', gap: 16 },
  title: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', fontSize: 25, letterSpacing: 2 },
  copy: { color: t.textDim, fontSize: 14, lineHeight: 21 },
  input: { minHeight: 50, color: t.bone, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong, padding: 14, borderRadius: Radii.md },
  message: { color: t.gold, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 50, backgroundColor: t.crimson, padding: 15, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md },
  buttonText: { color: t.onAccent, fontWeight: '900', letterSpacing: 1.5 },
});
