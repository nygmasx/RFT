import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

interface Member { id: string; firstName: string; lastName: string; avatarUrl?: string | null; }

export default function CreateChannelScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();

  const [channelName, setChannelName] = useState('');
  const [type, setType] = useState<'public' | 'prive'>('public');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<any[]>('/api/profile/all')
      .then((rows) => setMembers((rows ?? []).filter((m: any) => m.status === 'approved' && m.id !== user?.id)));
  }, [user?.id]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user || !channelName.trim() || saving) return;
    setSaving(true);
    setError(null);

    const isPrivate = type === 'prive';

    try {
      await api.post('/api/channels', {
        name:       channelName.trim(),
        description: description.trim() || null,
        is_private: isPrivate,
        member_ids: Array.from(selectedMembers),
      });
      setSaving(false);
      router.back();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="lock-closed" size={12} color={type === 'prive' ? t.bone : t.textDim} />
              <Text style={[styles.segBtnText, type === 'prive' && styles.segBtnTextActive]}>PRIVÉ</Text>
            </View>
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
          {members.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: t.textMute, fontSize: 13 }}>Aucun autre membre disponible</Text>
            </View>
          ) : members.map((m, i) => {
            const selected = selectedMembers.has(m.id);
            const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`;
            const displayName = `${m.firstName} ${m.lastName}`;
            return (
              <Pressable
                key={m.id}
                style={[styles.memberRow, i > 0 && styles.memberBorder]}
                onPress={() => toggleMember(m.id)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>{initials}</Text>
                </View>
                <Text style={styles.memberName}>{displayName}</Text>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Ionicons name="checkmark" size={14} color={t.bone} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaWrap}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        <Pressable
          style={[styles.ctaBtn, (!channelName.trim() || saving) && styles.ctaBtnDisabled]}
          onPress={handleCreate}
          disabled={!channelName.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color={t.bone} />
          ) : (
            <Text style={styles.ctaBtnText}>CRÉER LE SALON</Text>
          )}
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
    errorText: {
      fontFamily: FONTS.body, fontSize: 12, color: '#FF4444',
      marginBottom: 8, textAlign: 'center',
    },
  });
}
