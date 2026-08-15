import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FormScrollView } from '@/components/form-scroll-view';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authClient } from '@/lib/auth-client';

export default function LoginScreen() {
  const { theme: t } = useTheme();
  const { refreshProfileStatus } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Remplis tous les champs.'); return; }
    setError('');
    setLoading(true);
    const { error } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setLoading(false);
      setError(
        error.message.includes('Invalid') || error.message.includes('credentials')
          ? 'Email ou mot de passe incorrect.'
          : error.message
      );
      return;
    }
    await refreshProfileStatus();
    setLoading(false);
  };

  const s = styles(t);

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <FormScrollView
            contentContainerStyle={s.inner}
          >
            {/* Logo */}
            <View style={s.logoBlock}>
              <Image
                accessibilityLabel="Logo Ronin Fight Team"
                contentFit="contain"
                source={require('../../../assets/images/rft-mark.png')}
                style={s.logo}
              />
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

              <Pressable onPress={() => router.push('/(auth)/forgot-password' as never)} style={{ alignSelf: 'flex-end', paddingVertical: 4 }}>
                <Text style={{ color: t.textDim, fontSize: 12, textDecorationLine: 'underline' }}>Mot de passe oublié ?</Text>
              </Pressable>

              <View style={s.field}>
                <Text style={s.label}>MOT DE PASSE</Text>
                <View style={s.passwordField}>
                  <TextInput
                    style={[s.input, s.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={t.textMute}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    hitSlop={8}
                    onPress={() => setPasswordVisible((visible) => !visible)}
                    style={s.passwordToggle}
                  >
                    <Ionicons
                      name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={21}
                      color={t.textMute}
                    />
                  </Pressable>
                </View>
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
          </FormScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink },
  inner: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 24 },

  logoBlock: { alignItems: 'center', marginTop: 16, gap: 6 },
  logo: { width: 190, height: 158 },
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
  passwordField: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  passwordToggle: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 48,
    alignItems: 'center', justifyContent: 'center',
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
