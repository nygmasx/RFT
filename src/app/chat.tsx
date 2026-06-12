import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useMessages } from '@/hooks/useMessages';
import { Message } from '@/lib/database.types';

function Tag({ text, filled, t }: { text: string; filled?: boolean; t: Theme }) {
  return (
    <View style={[tagSt(t).wrap, filled && { backgroundColor: t.crimson }]}>
      <Text style={[tagSt(t).text, filled && { color: t.ink }]}>{text}</Text>
    </View>
  );
}

function tagSt(t: Theme) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: t.crimson, borderRadius: 2 },
    text: { fontFamily: FONTS.mono, fontSize: 8, color: t.crimson, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  });
}

interface MsgProps {
  msg: Message;
  isMe: boolean;
  t: Theme;
  msgStyles: ReturnType<typeof makeMsgStyles>;
}

function Msg({ msg, isMe, t, msgStyles }: MsgProps) {
  const authorName = msg.profiles
    ? `${msg.profiles.first_name} ${msg.profiles.last_name}`
    : 'Utilisateur';
  const timeStr = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (isMe) {
    return (
      <View style={msgStyles.meWrap}>
        <View style={msgStyles.meBubble}>
          <Text style={msgStyles.meText}>{msg.body}</Text>
        </View>
        <Text style={msgStyles.meMeta}>{timeStr} · LU</Text>
      </View>
    );
  }

  return (
    <View style={msgStyles.theirWrap}>
      <View style={msgStyles.theirAvatar}>
        <Text style={msgStyles.theirInitial}>{authorName[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={msgStyles.theirMeta}>
          <Text style={msgStyles.theirName}>{authorName}</Text>
          <Text style={msgStyles.theirTime}>{timeStr}</Text>
        </View>
        <View style={msgStyles.theirBubble}>
          <Text style={msgStyles.theirText}>{msg.body}</Text>
        </View>
      </View>
    </View>
  );
}

function makeMsgStyles(t: Theme) {
  return StyleSheet.create({
    meWrap: { alignItems: 'flex-end' },
    meBubble: {
      backgroundColor: t.crimson, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 12, borderBottomRightRadius: 2, maxWidth: 260,
    },
    meText: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, lineHeight: 19 },
    meMeta: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1, marginTop: 3 },
    theirWrap: { flexDirection: 'row', gap: 8 },
    theirAvatar: {
      width: 30, height: 30, borderRadius: 3, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
    },
    theirInitial: { fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900' },
    theirMeta: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
    theirName: { fontFamily: FONTS.body, fontSize: 11.5, fontWeight: '700', color: t.bone },
    theirTime: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1 },
    theirBubble: {
      backgroundColor: t.surface, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 2, borderTopLeftRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12,
      borderBottomLeftRadius: 12, borderWidth: 1, borderColor: t.hairline, maxWidth: 260,
    },
    theirText: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19, color: t.bone },
  });
}

export default function ChatScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const msgStyles = useMemo(() => makeMsgStyles(t), [t]);

  const { channel = '', name } = useLocalSearchParams<{ channel?: string; name?: string }>();
  const [messageText, setMessageText] = useState('');

  const { messages, loading, sendMessage, currentUserId } = useMessages(channel);

  const channelName = name ?? 'Salon';

  const isAnnonces = channel === 'annonces';
  const isParentsEnfants = channel === 'parents-enfants';
  const isCoachs = channel === 'coachs';
  const isReadOnly = isAnnonces;

  const handleSend = async () => {
    const body = messageText.trim();
    if (!body) return;
    setMessageText('');
    await sendMessage(body);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={[styles.chanAvatar, isAnnonces && styles.chanAvatarAnnonces]}>
            <Text style={styles.chanInitial}>{isAnnonces ? '☀' : channelName[0]}</Text>
          </View>
          <View style={styles.chanInfo}>
            <Text style={styles.chanName} numberOfLines={1}>{channelName}</Text>
            <Text style={styles.chanMeta}>
              SALON{isCoachs ? ' · PRIVÉ 🔒' : ''}
            </Text>
          </View>
          <Pressable>
            <Text style={styles.moreIcon}>···</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Private channel notice */}
      {isCoachs && (
        <View style={styles.privateNotice}>
          <Text style={styles.privateIcon}>🔒</Text>
          <Text style={styles.privateText}>SALON PRIVÉ — accès restreint aux coachs</Text>
        </View>
      )}

      {/* Annonces pinned notice */}
      {isAnnonces && (
        <View style={styles.pinned}>
          <Text style={styles.pinnedLabel}>📌  ÉPINGLÉ · ANNONCES DOJO</Text>
          <Text style={styles.pinnedText}>
            Retrouvez ici toutes les annonces officielles du club.
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messages}
      >
        <View style={styles.dateLine}>
          <Text style={styles.dateStamp}>AUJOURD'HUI</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={t.crimson} style={{ marginTop: 20 }} />
        ) : (
          messages.map((msg) => (
            <Msg
              key={msg.id}
              msg={msg}
              isMe={msg.user_id === currentUserId}
              t={t}
              msgStyles={msgStyles}
            />
          ))
        )}

        {/* Carpool system card for parents-enfants */}
        {isParentsEnfants && (
          <View style={styles.covCard}>
            <View style={styles.covHeader}>
              <Text style={styles.covIcon}>🚗</Text>
              <Text style={styles.covLabel}>COVOITURAGE PROPOSÉ</Text>
            </View>
            <Text style={styles.covTitle}>Voir les covoiturages disponibles</Text>
            <Text style={styles.covSub}>Consultez la section covoiturage pour les trajets</Text>
            <View style={styles.covActions}>
              <Pressable style={styles.covBtnPrimary} onPress={() => router.push('/covoiturage' as any)}>
                <Text style={styles.covBtnPrimaryText}>VOIR COVOITURAGES</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Composer */}
      {!isReadOnly ? (
        <SafeAreaView edges={['bottom']} style={styles.composer}>
          <Pressable style={styles.attachBtn}>
            <Text style={styles.attachIcon}>＋</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Écrire un message…"
            placeholderTextColor={t.textMute}
            value={messageText}
            onChangeText={setMessageText}
          />
          <Pressable
            style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </Pressable>
        </SafeAreaView>
      ) : (
        <SafeAreaView edges={['bottom']} style={styles.readOnlyBar}>
          <Text style={styles.readOnlyText}>📢 Ce salon est en lecture seule</Text>
        </SafeAreaView>
      )}
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
    chanAvatar: {
      width: 36, height: 36, borderRadius: 3, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center',
    },
    chanAvatarAnnonces: { backgroundColor: t.crimson },
    chanInitial: { fontFamily: FONTS.display, fontSize: 16, color: t.bone, fontWeight: '900' },
    chanInfo: { flex: 1, minWidth: 0 },
    chanName: { fontFamily: FONTS.body, fontSize: 14, fontWeight: '700', color: t.bone },
    chanMeta: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.2, marginTop: 1 },
    moreIcon: { fontSize: 18, color: t.bone, letterSpacing: 2 },
    privateNotice: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginTop: 12, marginBottom: 6, padding: 10,
      backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: t.hairlineStrong,
      borderRadius: 3,
    },
    privateIcon: { fontSize: 14 },
    privateText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 1 },
    pinned: {
      marginHorizontal: 16, marginTop: 12, marginBottom: 6, padding: 10,
      backgroundColor: 'rgba(200,54,45,0.08)', borderWidth: 1, borderColor: 'rgba(200,54,45,0.3)',
      borderRadius: 3,
    },
    pinnedLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.crimson, letterSpacing: 1.5, marginBottom: 4 },
    pinnedText: { fontFamily: FONTS.body, fontSize: 12.5, color: t.bone, lineHeight: 18 },
    messages: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
    dateLine: { alignItems: 'center', marginVertical: 8 },
    dateStamp: {
      fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 2,
      paddingHorizontal: 10, paddingVertical: 3,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 2,
    },
    covCard: {
      padding: 12, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairlineStrong, borderStyle: 'dashed', borderRadius: 3,
    },
    covHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    covIcon: { fontSize: 14 },
    covLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.crimson, letterSpacing: 1.5 },
    covTitle: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '600' },
    covSub: { fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim, marginTop: 2 },
    covActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    covBtnPrimary: {
      flex: 1, height: 32, backgroundColor: t.crimson, borderRadius: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    covBtnPrimaryText: {
      fontFamily: FONTS.display, fontSize: 11, fontWeight: '900',
      color: t.bone, letterSpacing: 1.5, textTransform: 'uppercase',
    },
    covBtnSecondary: {
      height: 32, paddingHorizontal: 12, borderRadius: 2,
      borderWidth: 1, borderColor: t.hairline, alignItems: 'center', justifyContent: 'center',
    },
    covBtnSecondaryText: {
      fontFamily: FONTS.display, fontSize: 11, fontWeight: '900',
      color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase',
    },
    composer: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
      backgroundColor: t.ink, borderTopWidth: 1, borderTopColor: t.hairline,
    },
    attachBtn: {
      width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: t.hairlineStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    attachIcon: { color: t.bone, fontSize: 18, lineHeight: 20 },
    input: {
      flex: 1, height: 36, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 18,
      paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 13, color: t.bone,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: t.crimson,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: t.elevated },
    sendIcon: { color: t.bone, fontSize: 14 },
    readOnlyBar: {
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
      backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.hairline,
      alignItems: 'center',
    },
    readOnlyText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5 },
  });
}
