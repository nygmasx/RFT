import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const { theme: t } = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Le code doit contenir 6 chiffres.'); return; }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setError('Code invalide ou expiré. Réessaie.');
      setCode('');
    }
    // Si succès, AuthContext redirige automatiquement vers les tabs
  };

  const handleResend = async () => {
    setError('');
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setError('Nouveau code envoyé.');
  };

  const s = styles(t);

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={s.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.top}>
            <Pressable onPress={() => router.back()} style={s.back}>
              <Text style={s.backIcon}>‹</Text>
            </Pressable>
          </View>

          <View style={s.content}>
            <Text style={s.title}>VÉRIFIE TON EMAIL</Text>
            <Text style={s.subtitle}>
              Code envoyé à{'\n'}
              <Text style={s.emailText}>{email}</Text>
            </Text>

            <TextInput
              ref={inputRef}
              style={s.codeInput}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={t.textMute}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleVerify}
            />

            {!!error && (
              <Text style={[s.errorText, error.includes('envoyé') && { color: t.gold }]}>
                {error}
              </Text>
            )}

            <Pressable
              style={[s.btn, (loading || code.length !== 6) && { opacity: 0.5 }]}
              onPress={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.btnText}>CONFIRMER →</Text>
              }
            </Pressable>

            <Pressable onPress={handleResend} style={s.resendBtn}>
              <Text style={s.resendText}>Renvoyer le code</Text>
            </Pressable>
          </View>

          <View />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink },
  inner: { flex: 1, paddingHorizontal: 28, paddingVertical: 16 },

  top: { marginBottom: 40 },
  back: { padding: 4, alignSelf: 'flex-start' },
  backIcon: { fontSize: 32, color: t.bone, lineHeight: 32 },

  content: { gap: 16 },
  title: {
    fontSize: 24, fontWeight: '900', color: t.bone,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  subtitle: { fontSize: 15, color: t.textDim, lineHeight: 22 },
  emailText: { color: t.bone, fontWeight: '700' },

  codeInput: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong,
    borderRadius: 4, paddingHorizontal: 14, paddingVertical: 16,
    fontSize: 32, color: t.bone, letterSpacing: 10, textAlign: 'center',
    marginVertical: 8,
  },

  errorText: { fontSize: 13, color: t.crimson, fontWeight: '500', textAlign: 'center' },
  btn: {
    backgroundColor: t.crimson, borderRadius: 4,
    paddingVertical: 15, alignItems: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },

  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 13, color: t.textDim, textDecorationLine: 'underline' },
});
