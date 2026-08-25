import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { FONTS, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { token, error: linkError } = useLocalSearchParams<{ token?: string; error?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState(linkError ? 'Ce lien est invalide ou expiré.' : '');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) return setMessage('Ce lien est invalide ou expiré.');
    if (password.length < 8) return setMessage('8 caractères minimum.');
    if (password !== confirm) return setMessage('Les mots de passe ne correspondent pas.');
    setLoading(true);
    const { error } = await authClient.resetPassword(password, token);
    setLoading(false);
    if (error) return setMessage(error.message);
    router.replace('/(auth)/login');
  };

  return <View style={styles.container}><SafeAreaView style={styles.safe}>
    <FormScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>NOUVEAU MOT DE PASSE</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="8 caractères minimum" placeholderTextColor={t.textMute} />
      <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirmer" placeholderTextColor={t.textMute} />
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Pressable style={styles.button} onPress={submit} disabled={loading || Boolean(linkError)}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ENREGISTRER</Text>}
      </Pressable>
    </FormScrollView>
  </SafeAreaView></View>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink }, safe: { flex: 1, padding: 24 }, content: { flexGrow: 1, justifyContent: 'center', gap: 16 },
  title: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', fontSize: 25, letterSpacing: 2 },
  input: { minHeight: 50, color: t.bone, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong, padding: 14, borderRadius: Radii.md },
  message: { color: t.crimson, fontSize: 13 }, button: { minHeight: 50, backgroundColor: t.crimson, padding: 15, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md },
  buttonText: { color: t.onAccent, fontWeight: '900', letterSpacing: 1.5 },
});
