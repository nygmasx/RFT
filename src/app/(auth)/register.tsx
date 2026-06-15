import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authClient } from '@/lib/auth-client';

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
  const [category, setCategory]   = useState('Adultes');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permission refusée.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
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
    } as any);

    setLoading(false);

    if (authError) {
      setError(
        authError.message.includes('already') || authError.message.includes('taken')
          ? 'Cet email est déjà utilisé.'
          : authError.message
      );
      return;
    }

    await refreshProfileStatus();
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
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.header}>
              <Pressable onPress={() => router.back()} style={s.back}>
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
                <TextInput style={s.input} value={password} onChangeText={setPassword}
                  placeholder="8 caractères minimum" placeholderTextColor={t.textMute}
                  secureTextEntry returnKeyType="next" />
              </View>

              <View style={s.field}>
                <Text style={s.label}>CONFIRMER LE MOT DE PASSE</Text>
                <TextInput style={s.input} value={confirm} onChangeText={setConfirm}
                  placeholder="••••••••" placeholderTextColor={t.textMute}
                  secureTextEntry returnKeyType="done" onSubmitEditing={handleRegister} />
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
          </ScrollView>
        </KeyboardAvoidingView>
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
    borderRadius: 4, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: t.bone,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: t.hairlineStrong, backgroundColor: t.surface },
  chipActive: { backgroundColor: t.crimson, borderColor: t.crimson },
  chipText: { fontSize: 12, fontWeight: '600', color: t.textDim },
  chipTextActive: { color: '#FFFFFF' },
  errorText: { fontSize: 12, color: t.crimson, fontWeight: '500' },
  btn: { backgroundColor: t.crimson, borderRadius: 4, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  hint: { fontSize: 12, color: t.textMute, textAlign: 'center', lineHeight: 18 },
});
