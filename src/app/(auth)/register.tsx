import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FormScrollView } from '@/components/form-scroll-view';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authClient, authRedirect } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';

const CATEGORIES = ['Adultes', 'Ados 13-17', 'Enfants 6-12'];

export default function RegisterScreen() {
  const { theme: t } = useTheme();
  const { refreshProfileStatus } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [category, setCategory]   = useState('Adultes');
  const [avatarUri, setAvatarUri]     = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permission refusée.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) { setError('Prénom et nom obligatoires.'); return; }
    if (!email.trim()) { setError('Email obligatoire.'); return; }
    if (password.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setError('');
    setLoading(true);

    const { error: authError } = await authClient.signUp.email({
      email:     email.trim().toLowerCase(),
      password,
      name:      `${firstName.trim()} ${lastName.trim()}`,
      // Additional fields via Better Auth
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone:     phone.trim() || undefined,
      category,
      status:    'pending',
      role:      'member',
      callbackURL: `${authRedirect('verify')}?email=${encodeURIComponent(email.trim().toLowerCase())}`,
    } as any);

    if (authError) {
      setLoading(false);
      setError(
        authError.message.includes('already') || authError.message.includes('taken')
          ? 'Cet email est déjà utilisé.'
          : authError.message
      );
      return;
    }

    // Upload avatar if one was picked
    if (avatarBase64) {
      await api.put('/api/profile/avatar', {
        dataUrl: `data:image/jpeg;base64,${avatarBase64}`,
      }).catch(() => {});
    }

    // Notify coaches of new registration
    await api.post('/api/push-tokens/notify-registration', {}).catch(() => {});

    setLoading(false);
    await refreshProfileStatus();
  };

  const s = useMemo(() => styles(t), [t]);

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <FormScrollView
            contentContainerStyle={s.scroll}
          >
            <View style={s.header}>
              <Pressable onPress={() => safeBack('/(auth)/login')} style={s.back}>
                <Text style={s.backIcon}>‹</Text>
              </Pressable>
              <Text style={s.title}>INSCRIPTION</Text>
              <View style={{ width: 40 }} />
            </View>

            <Pressable style={s.avatarBlock} onPress={pickAvatar}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={s.avatar} />
                : <View style={s.avatarPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={t.textMute} />
                    <Text style={s.avatarHint}>PHOTO DE PROFIL</Text>
                  </View>
              }
            </Pressable>

            <View style={s.form}>
              <View style={s.row}>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={s.label}>PRÉNOM</Text>
                  <TextInput style={s.input} value={firstName} onChangeText={setFirstName}
                    placeholder="Driss" placeholderTextColor={t.textMute}
                    autoCapitalize="words" returnKeyType="next" />
                </View>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={s.label}>NOM</Text>
                  <TextInput style={s.input} value={lastName} onChangeText={setLastName}
                    placeholder="Moreau" placeholderTextColor={t.textMute}
                    autoCapitalize="words" returnKeyType="next" />
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>EMAIL</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="ton@email.fr" placeholderTextColor={t.textMute}
                  keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
              </View>

              <View style={s.field}>
                <Text style={s.label}>TÉLÉPHONE</Text>
                <TextInput style={s.input} value={phone} onChangeText={setPhone}
                  placeholder="+33 6 12 34 56 78" placeholderTextColor={t.textMute}
                  keyboardType="phone-pad" returnKeyType="next" />
              </View>

              <View style={s.field}>
                <Text style={s.label}>CATÉGORIE</Text>
                <View style={s.chips}>
                  {CATEGORIES.map((c) => (
                    <Pressable key={c} style={[s.chip, category === c && s.chipActive]} onPress={() => setCategory(c)}>
                      <Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>MOT DE PASSE</Text>
                <View style={s.passwordField}>
                  <TextInput style={[s.input, s.passwordInput]} value={password} onChangeText={setPassword}
                    placeholder="8 caractères minimum" placeholderTextColor={t.textMute}
                    secureTextEntry={!passwordVisible} returnKeyType="next" />
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

              <View style={s.field}>
                <Text style={s.label}>CONFIRMER LE MOT DE PASSE</Text>
                <View style={s.passwordField}>
                  <TextInput style={[s.input, s.passwordInput]} value={confirm} onChangeText={setConfirm}
                    placeholder="••••••••" placeholderTextColor={t.textMute}
                    secureTextEntry={!confirmVisible} returnKeyType="done" onSubmitEditing={handleRegister} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={confirmVisible ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                    hitSlop={8}
                    onPress={() => setConfirmVisible((visible) => !visible)}
                    style={s.passwordToggle}
                  >
                    <Ionicons
                      name={confirmVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={21}
                      color={t.textMute}
                    />
                  </Pressable>
                </View>
              </View>

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.btnText}>ENVOYER MA DEMANDE →</Text>
                }
              </Pressable>

              <Text style={s.hint}>Ton profil sera vérifié par le coach avant activation.</Text>
            </View>
          </FormScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  back: { width: 40, padding: 4 },
  backIcon: { fontSize: 32, color: t.bone, lineHeight: 32 },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900', color: t.bone, letterSpacing: 2 },
  avatarBlock: { alignSelf: 'center', marginBottom: 28 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: t.crimson },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: t.surface, borderWidth: 2, borderColor: t.hairlineStrong,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  avatarHint: { fontSize: 8, color: t.textMute, letterSpacing: 1 },
  form: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 10, fontWeight: '700', color: t.textMute, letterSpacing: 2 },
  input: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong,
    borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: t.bone,
  },
  passwordField: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  passwordToggle: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.round, borderWidth: 1, borderColor: t.hairlineStrong, backgroundColor: t.surface },
  chipActive: { backgroundColor: t.crimson, borderColor: t.crimson },
  chipText: { fontSize: 12, fontWeight: '600', color: t.textDim },
  chipTextActive: { color: t.onAccent },
  errorText: { fontSize: 12, color: t.crimson, fontWeight: '500' },
  btn: { minHeight: 50, backgroundColor: t.crimson, borderRadius: Radii.md, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 13, fontWeight: '900', color: t.onAccent, letterSpacing: 2 },
  hint: { fontSize: 12, color: t.textMute, textAlign: 'center', lineHeight: 18 },
});
