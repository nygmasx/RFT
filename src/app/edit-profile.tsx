import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';

const CATEGORIES = ['Adultes', 'Ados 13-17', 'Enfants 6-12'];
const WEIGHT_CLASSES = ['-64kg', '-70kg', '-77kg', '-85kg', '-94kg', '+94kg'];
const STANCE_OPTIONS = ['Droitier', 'Gaucher'];

export default function EditProfileScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { profile, loading, updateProfile } = useProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [category, setCategory] = useState('Adultes');
  const [weightClass, setWeightClass] = useState('-77kg');
  const [stance, setStance] = useState('Droitier');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setCategory(profile.category ?? 'Adultes');
      setWeightClass(profile.weightClass ?? '-77kg');
      setStance(profile.stance ?? 'Droitier');
      setPhone(profile.phone ?? '');
      setAvatarUri(profile.avatarUrl ?? null);
    }
  }, [profile]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setAvatarUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      firstName,
      lastName,
      category,
      weightClass,
      stance,
      phone,
      avatarUrl: avatarUri ?? undefined,
    });
    setSaving(false);
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={t.crimson} />
      </View>
    );
  }

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>MODIFIER LE PROFIL</Text>
          <Pressable onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={t.crimson} size="small" />
              : <Text style={styles.saveText}>ENREGISTRER</Text>
            }
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80, borderRadius: 4 }} />
              : <Text style={styles.avatarText}>{initials}</Text>
            }
          </View>
          <Pressable style={styles.photoBtn} onPress={pickAvatar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera-outline" size={14} color={t.crimson} />
              <Text style={styles.photoLabel}>Modifier la photo</Text>
            </View>
          </Pressable>
        </View>

        {/* IDENTITÉ */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>IDENTITÉ</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>PRÉNOM</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>NOM</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
        </View>

        {/* PRATIQUE */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>PRATIQUE</Text>
        </View>
        <View style={styles.card}>
          {/* Catégorie */}
          <Text style={styles.fieldLabel}>CATÉGORIE</Text>
          <View style={styles.segmented}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.pill, category === c && styles.pillActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Poids */}
          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>CATÉGORIE DE POIDS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={styles.chipsRow}>
              {WEIGHT_CLASSES.map((w) => (
                <Pressable
                  key={w}
                  style={[styles.chip, weightClass === w && styles.chipActive]}
                  onPress={() => setWeightClass(w)}
                >
                  <Text style={[styles.chipText, weightClass === w && styles.chipTextActive]}>{w}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.divider} />

          {/* Latéralité */}
          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>LATÉRALITÉ</Text>
          <View style={styles.segmented}>
            {STANCE_OPTIONS.map((s) => (
              <Pressable
                key={s}
                style={[styles.pill, stance === s && styles.pillActive]}
                onPress={() => setStance(s)}
              >
                <Text style={[styles.pillText, stance === s && styles.pillTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* CONTACT */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>CONTACT</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>TÉLÉPHONE</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    title: {
      flex: 1, fontFamily: FONTS.display, fontSize: 16, color: t.bone,
      fontWeight: '900', letterSpacing: 0.5,
    },
    saveText: { fontFamily: FONTS.mono, fontSize: 11, color: t.crimson, fontWeight: '700', letterSpacing: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },

    // Avatar
    avatarSection: { alignItems: 'center', paddingVertical: 16, gap: 10 },
    avatar: {
      width: 80, height: 80, backgroundColor: t.crimson, borderRadius: 4,
      borderWidth: 2, borderColor: t.crimsonDeep,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: FONTS.display, fontSize: 32, color: t.bone, fontWeight: '900' },
    photoBtn: {},
    photoLabel: { fontFamily: FONTS.body, fontSize: 13, color: t.textDim },

    // Section label
    sectionLabel: { paddingTop: 8 },
    sectionLabelText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2 },

    // Card
    card: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, paddingHorizontal: 14, paddingVertical: 4,
    },
    divider: { height: 1, backgroundColor: t.hairline, marginVertical: 2 },

    // Field
    fieldRow: { paddingVertical: 10 },
    fieldLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1.5, marginBottom: 6 },
    input: {
      fontFamily: FONTS.body, fontSize: 15, color: t.bone, fontWeight: '500',
      paddingVertical: 0,
    },

    // Segmented / pills
    segmented: { flexDirection: 'row', gap: 6, marginTop: 8 },
    pill: {
      flex: 1, paddingVertical: 8, borderRadius: 2, borderWidth: 1,
      borderColor: t.hairlineStrong, alignItems: 'center',
    },
    pillActive: { backgroundColor: t.crimson, borderColor: t.crimson },
    pillText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 0.5 },
    pillTextActive: { color: t.bone, fontWeight: '700' },

    // Chips
    chipsRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 2, borderWidth: 1,
      borderColor: t.hairlineStrong,
    },
    chipActive: { backgroundColor: t.crimson, borderColor: t.crimson },
    chipText: { fontFamily: FONTS.mono, fontSize: 10.5, color: t.textDim },
    chipTextActive: { color: t.bone, fontWeight: '700' },
  });
}
