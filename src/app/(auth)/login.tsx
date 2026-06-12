import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { theme: t } = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Remplis tous les champs.'); return; }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes('Invalid login')
          ? 'Email ou mot de passe incorrect.'
          : error.message
      );
    }
    // AuthContext redirige automatiquement selon le statut du profil
  };

  const s = styles(t);

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.inner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={s.logoBlock}>
              <View style={s.sunMark}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={[s.ray, { transform: [{ rotate: `${i * 45}deg` }] }]} />
                ))}
                <View style={s.sunCore} />
              </View>
              <Text style={s.clubName}>RONIN FIGHT TEAM</Text>
              <Text style={s.tagline}>MONTATAIRE · OISE</Text>
            </View>

            {/* Form */}
            <View style={s.form}>
              <Text style={s.formTitle}>CONNEXION</Text>

              <View style={s.field}>
                <Text style={s.label}>EMAIL</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ton@email.fr"
                  placeholderTextColor={t.textMute}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>MOT DE PASSE</Text>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={t.textMute}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <Pressable
                style={[s.btn, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.btnText}>SE CONNECTER →</Text>
                }
              </Pressable>

              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>PAS ENCORE MEMBRE ?</Text>
                <View style={s.dividerLine} />
              </View>

              <Pressable style={s.btnSecondary} onPress={() => router.push('/(auth)/register')}>
                <Text style={s.btnSecondaryText}>CRÉER UN COMPTE</Text>
              </Pressable>
            </View>

            <Text style={s.footer}>Accès réservé aux membres du club</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink },
  inner: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 24 },

  logoBlock: { alignItems: 'center', marginTop: 32, gap: 10 },
  sunMark: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  ray: {
    position: 'absolute', width: 3, height: 26,
    backgroundColor: t.crimson, borderRadius: 2,
    top: 0, left: 30.5, transformOrigin: '50% 32px',
  },
  sunCore: { width: 20, height: 20, borderRadius: 10, backgroundColor: t.crimson },
  clubName: { fontSize: 22, fontWeight: '900', color: t.bone, letterSpacing: 3, textTransform: 'uppercase' },
  tagline: { fontSize: 10, fontWeight: '600', color: t.textMute, letterSpacing: 3, textTransform: 'uppercase' },

  form: { gap: 12 },
  formTitle: { fontSize: 18, fontWeight: '900', color: t.bone, letterSpacing: 2, marginBottom: 4 },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: '700', color: t.textMute, letterSpacing: 2 },
  input: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong,
    borderRadius: 4, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: t.bone,
  },
  errorText: { fontSize: 12, color: t.crimson, fontWeight: '500' },
  btn: {
    backgroundColor: t.crimson, borderRadius: 4,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  btnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  btnSecondary: {
    borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 4,
    paddingVertical: 14, alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '700', color: t.textDim, letterSpacing: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.hairline },
  dividerText: { fontSize: 9, color: t.textMute, letterSpacing: 1.5 },

  footer: { fontSize: 11, color: t.textMute, textAlign: 'center', letterSpacing: 1, marginTop: 16 },
});
