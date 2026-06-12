import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

const DUMMY_MEMBERS = [
  'Driss M.',
  'Karim B.',
  'Léa P.',
  'Thomas V.',
  'Maïté D.',
  'Yannis L.',
  'Isabelle R.',
  'Coach Sophie',
];

export default function CreateChannelScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [channelName, setChannelName] = useState('');
  const [type, setType] = useState<'public' | 'prive'>('public');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const toggleMember = (name: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreate = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>NOUVEAU SALON</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nom du salon */}
        <Text style={styles.fieldLabel}>NOM DU SALON</Text>
        <TextInput
          style={styles.textInput}
          placeholder="ex: Adultes — Compétiteurs"
          placeholderTextColor={t.textMute}
          value={channelName}
          onChangeText={setChannelName}
          autoCorrect={false}
        />

        {/* Type */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>TYPE</Text>
        <View style={styles.segmented}>
          <Pressable
            style={[styles.segBtn, type === 'public' && styles.segBtnActive]}
            onPress={() => setType('public')}
          >
            <Text style={[styles.segBtnText, type === 'public' && styles.segBtnTextActive]}>
              PUBLIC
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, type === 'prive' && styles.segBtnActive]}
            onPress={() => setType('prive')}
          >
            <Text style={[styles.segBtnText, type === 'prive' && styles.segBtnTextActive]}>
              🔒 PRIVÉ
            </Text>
          </Pressable>
        </View>

        {/* Description */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>DESCRIPTION</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMulti]}
          placeholder="Décrivez l'objectif de ce salon…"
          placeholderTextColor={t.textMute}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Members */}
        <Text style={[styles.sectionHeader, { marginTop: 28 }]}>AJOUTER DES MEMBRES</Text>
        <View style={styles.memberList}>
          {DUMMY_MEMBERS.map((name, i) => {
            const selected = selectedMembers.has(name);
            return (
              <Pressable
                key={i}
                style={[styles.memberRow, i > 0 && styles.memberBorder]}
                onPress={() => toggleMember(name)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>{name[0]}</Text>
                </View>
                <Text style={styles.memberName}>{name}</Text>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaWrap}>
        <Pressable
          style={[styles.ctaBtn, !channelName.trim() && styles.ctaBtnDisabled]}
          onPress={handleCreate}
        >
          <Text style={styles.ctaBtnText}>CRÉER LE SALON</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    headerTitle: {
      flex: 1, textAlign: 'center',
      fontFamily: FONTS.display, fontSize: 14, color: t.bone,
      fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    },
    headerSpacer: { width: 36 },
    scroll: { paddingHorizontal: 20, paddingTop: 24 },
    fieldLabel: {
      fontFamily: FONTS.mono, fontSize: 10, color: t.textMute,
      letterSpacing: 2, marginBottom: 8,
    },
    textInput: {
      height: 44, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
      paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 14, color: t.bone,
    },
    textInputMulti: {
      height: 80, paddingTop: 12, paddingBottom: 12,
    },
    segmented: {
      flexDirection: 'row', gap: 8,
    },
    segBtn: {
      flex: 1, height: 40, borderRadius: 3,
      borderWidth: 1, borderColor: t.hairlineStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    segBtnActive: {
      backgroundColor: t.crimson, borderColor: t.crimson,
    },
    segBtnText: {
      fontFamily: FONTS.display, fontSize: 12, color: t.textDim,
      fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase',
    },
    segBtnTextActive: { color: t.bone },
    sectionHeader: {
      fontFamily: FONTS.mono, fontSize: 10, color: t.textMute,
      letterSpacing: 2, marginBottom: 8,
    },
    memberList: {
      backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    memberRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 13, paddingHorizontal: 14,
    },
    memberBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    memberAvatar: {
      width: 32, height: 32, borderRadius: 3, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center',
    },
    memberInitial: { fontFamily: FONTS.display, fontSize: 14, color: t.bone, fontWeight: '900' },
    memberName: { flex: 1, fontFamily: FONTS.body, fontSize: 13.5, color: t.bone, fontWeight: '600' },
    checkbox: {
      width: 22, height: 22, borderRadius: 3,
      borderWidth: 1.5, borderColor: t.hairlineStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: t.crimson, borderColor: t.crimson,
    },
    checkmark: { color: t.bone, fontSize: 13, fontWeight: '700' },
    ctaWrap: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
      backgroundColor: t.ink, borderTopWidth: 1, borderTopColor: t.hairline,
    },
    ctaBtn: {
      height: 50, backgroundColor: t.crimson, borderRadius: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaBtnDisabled: { backgroundColor: t.elevated },
    ctaBtnText: {
      fontFamily: FONTS.display, fontSize: 14, color: t.bone,
      fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    },
  });
}
