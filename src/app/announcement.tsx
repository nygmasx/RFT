import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

const DEFAULT_REACTIONS = [
  { emoji: '✊', count: 0 },
  { emoji: '🔥', count: 0 },
  { emoji: '👍', count: 0 },
];

export default function AnnouncementScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { id } = useLocalSearchParams<{ id?: string }>();

  interface AnnouncementDetail {
    id: string; title: string; body: string;
    tag: string | null; pinned: boolean; createdAt: string;
    profiles: { first_name: string; last_name: string };
  }

  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactedIndices, setReactedIndices] = useState<Set<number>>(new Set());
  const [reply, setReply] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<AnnouncementDetail>(`/api/announcements/${id}`)
      .then((data) => { setAnnouncement(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const toggleReaction = (i: number) => {
    setReactedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={t.crimson} />
      </View>
    );
  }

  if (!announcement) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: t.textMute, fontFamily: FONTS.body }}>Annonce introuvable.</Text>
      </View>
    );
  }

  const authorName = announcement.profiles
    ? `${announcement.profiles.first_name} ${announcement.profiles.last_name}`
    : 'Coach';

  const authorInitials = authorName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const authorDate = new Date(announcement.createdAt).toLocaleString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerLabel}>ANNONCE</Text>
          <Pressable style={styles.shareBtn}>
            <Text style={styles.shareIcon}>↗</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tag */}
        <View style={styles.tagRow}>
          {announcement.tag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{announcement.tag}</Text>
            </View>
          )}
          {announcement.pinned && (
            <View style={[styles.tag, styles.tagOutline]}>
              <Text style={[styles.tagText, { color: t.textDim }]}>ÉPINGLÉ</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{announcement.title}</Text>

        {/* Author card */}
        <View style={styles.authorCard}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitials}>{authorInitials}</Text>
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorRow}>
              <Text style={styles.authorName}>{authorName}</Text>
              <View style={styles.coachBadge}>
                <Text style={styles.coachBadgeText}>COACH</Text>
              </View>
            </View>
            <Text style={styles.authorDate}>{authorDate}</Text>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.body}>{announcement.body}</Text>

        {/* Reactions (local state) */}
        <View style={styles.reactionBar}>
          {DEFAULT_REACTIONS.map((r, i) => (
            <Pressable
              key={i}
              style={[styles.reactionBtn, reactedIndices.has(i) && styles.reactionBtnActive]}
              onPress={() => toggleReaction(i)}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text style={[styles.reactionCount, reactedIndices.has(i) && { color: t.crimson }]}>
                {r.count + (reactedIndices.has(i) ? 1 : 0)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Composer */}
      <SafeAreaView edges={['bottom']} style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Écrire une réponse…"
          placeholderTextColor={t.textMute}
          value={reply}
          onChangeText={setReply}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, !reply.trim() && styles.sendBtnDisabled]}
          onPress={() => setReply('')}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    headerLabel: {
      fontFamily: FONTS.mono, fontSize: 11, color: t.textMute,
      letterSpacing: 2, textTransform: 'uppercase',
    },
    shareBtn: { padding: 4 },
    shareIcon: { fontSize: 20, color: t.bone },
    scroll: { paddingHorizontal: 20, paddingTop: 20 },
    tagRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    tag: {
      paddingHorizontal: 8, paddingVertical: 4,
      backgroundColor: t.crimson, borderRadius: 2,
    },
    tagOutline: {
      backgroundColor: 'transparent', borderWidth: 1, borderColor: t.hairlineStrong,
    },
    tagText: {
      fontFamily: FONTS.mono, fontSize: 9, color: t.bone,
      fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase',
    },
    title: {
      fontFamily: FONTS.display, fontSize: 28, color: t.bone,
      fontWeight: '900', letterSpacing: 0.5, lineHeight: 32, marginBottom: 18,
      textTransform: 'uppercase',
    },
    authorCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 12, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
      marginBottom: 20,
    },
    authorAvatar: {
      width: 40, height: 40, borderRadius: 3, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center',
    },
    authorInitials: {
      fontFamily: FONTS.display, fontSize: 15, color: t.crimson, fontWeight: '900',
    },
    authorInfo: { flex: 1 },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    authorName: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700' },
    coachBadge: {
      paddingHorizontal: 6, paddingVertical: 2, backgroundColor: t.crimson, borderRadius: 2,
    },
    coachBadgeText: {
      fontFamily: FONTS.mono, fontSize: 8, color: t.bone,
      fontWeight: '600', letterSpacing: 1,
    },
    authorDate: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1, marginTop: 3 },
    body: {
      fontFamily: FONTS.body, fontSize: 14, color: t.text,
      lineHeight: 22, marginBottom: 24,
    },
    reactionBar: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    reactionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 8,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 20,
    },
    reactionBtnActive: {
      backgroundColor: 'rgba(200,54,45,0.1)', borderColor: t.crimson,
    },
    reactionEmoji: { fontSize: 16 },
    reactionCount: { fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, fontWeight: '600' },
    composer: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 10,
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
      backgroundColor: t.ink, borderTopWidth: 1, borderTopColor: t.hairline,
    },
    composerInput: {
      flex: 1, minHeight: 36, maxHeight: 100, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 9,
      fontFamily: FONTS.body, fontSize: 13, color: t.bone,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: t.crimson,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: t.elevated },
    sendIcon: { color: t.bone, fontSize: 14 },
  });
}
