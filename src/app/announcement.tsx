import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { ANNOUNCEMENTS } from '@/data/rft-data';

export default function AnnouncementScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { id } = useLocalSearchParams<{ id?: string }>();
  const announcement = ANNOUNCEMENTS.find((a) => a.id === id) ?? ANNOUNCEMENTS[0];

  const [reactedIndices, setReactedIndices] = useState<Set<number>>(new Set());
  const [reply, setReply] = useState('');

  const toggleReaction = (i: number) => {
    setReactedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const authorInitials = announcement.author
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          <View style={styles.tag}>
            <Text style={styles.tagText}>{announcement.tag}</Text>
          </View>
          {announcement.pinned && (
            <View style={[styles.tag, styles.tagOutline]}>
              <Text style={[styles.tagText, { color: t.textDim }]}>📌 ÉPINGLÉ</Text>
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
              <Text style={styles.authorName}>{announcement.author}</Text>
              <View style={styles.coachBadge}>
                <Text style={styles.coachBadgeText}>COACH</Text>
              </View>
            </View>
            <Text style={styles.authorDate}>{announcement.date}</Text>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.body}>{announcement.body}</Text>

        {/* Reactions */}
        <View style={styles.reactionBar}>
          {announcement.reactions.map((r, i) => (
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

        {/* Divider */}
        <View style={styles.divider} />

        {/* Replies header */}
        <View style={styles.repliesHeader}>
          <Text style={styles.repliesLabel}>RÉPONSES ({announcement.replies})</Text>
          <Pressable>
            <Text style={styles.replyAction}>Répondre</Text>
          </Pressable>
        </View>

        {/* Reply bubbles */}
        <View style={styles.replyBubble}>
          <View style={styles.replyAvatar}>
            <Text style={styles.replyAvatarText}>D</Text>
          </View>
          <View style={styles.replyContent}>
            <View style={styles.replyMeta}>
              <Text style={styles.replyAuthor}>Driss M.</Text>
              <Text style={styles.replyTime}>10:22</Text>
            </View>
            <View style={styles.replyBubbleInner}>
              <Text style={styles.replyText}>Je confirme ! À samedi 💪</Text>
            </View>
          </View>
        </View>

        <View style={styles.replyBubble}>
          <View style={styles.replyAvatar}>
            <Text style={styles.replyAvatarText}>L</Text>
          </View>
          <View style={styles.replyContent}>
            <View style={styles.replyMeta}>
              <Text style={styles.replyAuthor}>Léa P.</Text>
              <Text style={styles.replyTime}>11:05</Text>
            </View>
            <View style={styles.replyBubbleInner}>
              <Text style={styles.replyText}>Présente aussi, merci coach !</Text>
            </View>
          </View>
        </View>

        <View style={styles.replyBubble}>
          <View style={styles.replyAvatar}>
            <Text style={styles.replyAvatarText}>K</Text>
          </View>
          <View style={styles.replyContent}>
            <View style={styles.replyMeta}>
              <Text style={styles.replyAuthor}>Karim B.</Text>
              <Text style={styles.replyTime}>11:47</Text>
            </View>
            <View style={styles.replyBubbleInner}>
              <Text style={styles.replyText}>Top ! Est-ce qu'on peut venir aussi en No-Gi ou seulement GI ?</Text>
            </View>
          </View>
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
    divider: { height: 1, backgroundColor: t.hairline, marginBottom: 20 },
    repliesHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 16,
    },
    repliesLabel: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    replyAction: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, letterSpacing: 1.5 },
    replyBubble: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    replyAvatar: {
      width: 30, height: 30, borderRadius: 3, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
    },
    replyAvatarText: { fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900' },
    replyContent: { flex: 1 },
    replyMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
    replyAuthor: { fontFamily: FONTS.body, fontSize: 12, color: t.bone, fontWeight: '700' },
    replyTime: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1 },
    replyBubbleInner: {
      backgroundColor: t.surface, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 2, borderTopLeftRadius: 0, borderTopRightRadius: 10,
      borderBottomRightRadius: 10, borderBottomLeftRadius: 10,
      borderWidth: 1, borderColor: t.hairline,
    },
    replyText: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, lineHeight: 19 },
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
