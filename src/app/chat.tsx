import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useMessages } from '@/hooks/useMessages';
import { safeBack } from '@/lib/navigation';
import { Message } from '@/lib/database.types';
import { useAuth } from '@/context/AuthContext';

interface MsgProps {
  msg: Message;
  isMe: boolean;
  t: Theme;
  msgStyles: ReturnType<typeof makeMsgStyles>;
  onLongPress: () => void;
  highlighted: boolean;
  activeVoiceUrl: string | null;
  onVoiceActivate: (url: string | null) => void;
  onReplyPress: (messageId: string) => void;
  onReactionPress: (emoji: string) => void;
}

function Msg({ msg, isMe, t, msgStyles, onLongPress, highlighted, activeVoiceUrl, onVoiceActivate, onReplyPress, onReactionPress }: MsgProps) {
  const authorName = msg.profiles
    ? `${msg.profiles.first_name} ${msg.profiles.last_name}`
    : 'Utilisateur';
  const timeStr = new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const body = msg.body ? msg.body.split(/(@[\p{L}\d._-]+)/gu).map((part, index) => (
    <Text key={`${part}-${index}`} style={part.startsWith('@') ? msgStyles.mention : undefined}>{part}</Text>
  )) : null;
  const content = msg.messageType === 'image' && msg.mediaUrl
    ? <ExpoImage source={{ uri: msg.mediaUrl }} style={msgStyles.photo} contentFit="cover" transition={150} />
    : msg.messageType === 'audio' && msg.mediaUrl
      ? <VoiceBubble
          url={msg.mediaUrl}
          durationMs={msg.mediaDurationMs}
          t={t}
          styles={msgStyles}
          active={activeVoiceUrl === msg.mediaUrl}
          onActivate={onVoiceActivate}
        />
      : null;
  const reply = msg.replyTo ? (
    <Pressable style={msgStyles.replyQuote} onPress={() => onReplyPress(msg.replyTo!.id)}>
      <Text style={msgStyles.replyAuthor} numberOfLines={1}>{msg.replyTo.authorName}</Text>
      <Text style={msgStyles.replyBody} numberOfLines={1}>
        {msg.replyTo.messageType === 'audio' ? '🎤 Message vocal' : msg.replyTo.messageType === 'image' ? '📷 Photo' : msg.replyTo.body}
      </Text>
    </Pressable>
  ) : null;
  const reactions = msg.reactions?.length ? (
    <View style={[msgStyles.reactions, isMe && msgStyles.reactionsMe]}>
      {msg.reactions.map((reaction) => (
        <Pressable
          key={reaction.emoji}
          style={[msgStyles.reactionChip, reaction.reacted && msgStyles.reactionChipActive]}
          onPress={() => onReactionPress(reaction.emoji)}
        >
          <Text style={msgStyles.reactionText}>{reaction.emoji} {reaction.count}</Text>
        </Pressable>
      ))}
    </View>
  ) : null;
  const edited = msg.updatedAt ? ' · MODIFIÉ' : '';

  if (isMe) {
    return (
      <Pressable style={[msgStyles.meWrap, highlighted && msgStyles.highlighted]} onLongPress={onLongPress}>
        <View style={msgStyles.meBubble}>
          {reply}
          {content}
          {body ? <Text style={msgStyles.meText}>{body}</Text> : null}
        </View>
        {reactions}
        <Text style={msgStyles.meMeta}>{timeStr}{edited} · {msg.readCount > 0 ? 'LU' : 'ENVOYÉ'}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={[msgStyles.theirWrap, highlighted && msgStyles.highlighted]} onLongPress={onLongPress}>
      <View style={msgStyles.theirAvatar}>
        <Text style={msgStyles.theirInitial}>{authorName[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={msgStyles.theirMeta}>
          <Text style={msgStyles.theirName}>{authorName}</Text>
          <Text style={msgStyles.theirTime}>{timeStr}</Text>
        </View>
        <View style={msgStyles.theirBubble}>
          {reply}
          {content}
          {body ? <Text style={msgStyles.theirText}>{body}</Text> : null}
        </View>
        {reactions}
      </View>
    </Pressable>
  );
}

function VoiceBubble({ url, durationMs, t, styles, active, onActivate }: {
  url: string;
  durationMs: number | null;
  t: Theme;
  styles: ReturnType<typeof makeMsgStyles>;
  active: boolean;
  onActivate: (url: string | null) => void;
}) {
  const player = useAudioPlayer(url, { updateInterval: 200, downloadFirst: true, preferredForwardBufferDuration: 5 });
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState(1);
  const total = status.duration || (durationMs ?? 0) / 1000;
  const shown = status.currentTime > 0 && !status.didJustFinish ? status.currentTime : total;

  useEffect(() => {
    if (!active && status.playing) player.pause();
  }, [active, player, status.playing]);

  const togglePlayback = async () => {
    if (status.error) {
      player.replace(url);
      return;
    }
    if (status.playing) {
      player.pause();
      onActivate(null);
      return;
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'doNotMix', shouldRouteThroughEarpiece: false });
    if (status.didJustFinish || (total > 0 && status.currentTime >= total - 0.05)) await player.seekTo(0);
    onActivate(url);
    player.play();
  };

  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    player.setPlaybackRate(next);
  };

  return <View style={styles.voice}>
    <Pressable accessibilityLabel={status.playing ? 'Mettre le vocal en pause' : 'Lire le vocal'} onPress={() => void togglePlayback()}>
      {status.isBuffering || (!status.isLoaded && !status.error)
        ? <ActivityIndicator size="small" color={t.bone} />
        : <Ionicons name={status.error ? 'refresh' : status.playing ? 'pause' : 'play'} size={18} color={t.bone} />}
    </Pressable>
    <View style={styles.voiceTrack}><View style={[styles.voiceProgress, { width: `${total > 0 ? Math.min(100, status.currentTime / total * 100) : 0}%` }]} /></View>
    <Text style={styles.voiceTime}>{Math.floor(shown / 60)}:{String(Math.round(shown % 60)).padStart(2, '0')}</Text>
    <Pressable accessibilityLabel="Changer la vitesse de lecture" onPress={cycleRate} style={styles.voiceRate}>
      <Text style={styles.voiceRateText}>{rate}×</Text>
    </Pressable>
  </View>;
}

function makeMsgStyles(t: Theme) {
  return StyleSheet.create({
    meWrap: { alignItems: 'flex-end' },
    highlighted: { backgroundColor: t.crimson + '20', borderRadius: 10, padding: 6, marginHorizontal: -6 },
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
    mention: { color: '#FFD166', fontWeight: '800' },
    replyQuote: { borderLeftWidth: 3, borderLeftColor: '#FFD166', backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 6, minWidth: 150 },
    replyAuthor: { color: '#FFD166', fontFamily: FONTS.body, fontSize: 10, fontWeight: '800' },
    replyBody: { color: t.bone, opacity: 0.78, fontFamily: FONTS.body, fontSize: 10, marginTop: 1 },
    reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -3, marginLeft: 8 },
    reactionsMe: { justifyContent: 'flex-end', marginRight: 8 },
    reactionChip: { borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong },
    reactionChipActive: { borderColor: t.crimson, backgroundColor: t.crimson + '24' },
    reactionText: { color: t.bone, fontFamily: FONTS.mono, fontSize: 9 },
    photo: { width: 220, height: 180, borderRadius: 8, marginBottom: 4 },
    voice: { minWidth: 210, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    voiceTrack: { flex: 1, height: 3, backgroundColor: t.hairlineStrong, borderRadius: 2, overflow: 'hidden' },
    voiceProgress: { height: 3, backgroundColor: t.bone },
    voiceTime: { color: t.bone, fontFamily: FONTS.mono, fontSize: 9 },
    voiceRate: { minWidth: 28, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    voiceRateText: { color: t.bone, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800' },
  });
}

export default function ChatScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const msgStyles = useMemo(() => makeMsgStyles(t), [t]);

  const { channel = '', name, message: targetMessageId } = useLocalSearchParams<{ channel?: string; name?: string; message?: string }>();
  const [messageText, setMessageText] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [activeVoiceUrl, setActiveVoiceUrl] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const { messages, members, loading, sendMessage, sendMedia, deleteMessage, editMessage, toggleReaction, refetch, currentUserId } = useMessages(channel);
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const focusedTargetRef = useRef<string | null>(null);

  const channelName = name ?? 'Salon';

  const isAnnonces = channel === 'annonces';
  const isParentsEnfants = channel === 'parents-enfants';
  const isCoachs = channel === 'coachs';
  const isReadOnly = isAnnonces;
  const canEditSelected = Boolean(
    selectedMessage
    && selectedMessage.userId === currentUserId
    && selectedMessage.messageType === 'text',
  );

  const handleSend = async () => {
    const body = messageText.trim();
    if (!body) return;
    setMessageText('');
    const selectedIds = mentionIds;
    setMentionIds([]);
    try {
      if (editingMessage) await editMessage(editingMessage.id, body);
      else await sendMessage(body, selectedIds, replyingTo?.id);
      setEditingMessage(null);
      setReplyingTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) {
      setMessageText(body);
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    }
  };

  const mentionQuery = messageText.match(/@([\p{L}\d._-]*)$/u)?.[1]?.toLocaleLowerCase('fr-FR');
  const mentionCandidates = mentionQuery === undefined ? [] : members.filter((member) =>
    `${member.firstName} ${member.lastName}`.toLocaleLowerCase('fr-FR').includes(mentionQuery)
  ).slice(0, 5);

  const insertMention = (member: typeof members[number]) => {
    const handle = `@${`${member.firstName}_${member.lastName}`.replace(/\s+/g, '_')}`;
    setMessageText((current) => current.replace(/@[\p{L}\d._-]*$/u, `${handle} `));
    setMentionIds((current) => current.includes(member.id) ? current : [...current, member.id]);
  };

  const sendPickedImage = async (camera: boolean) => {
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Autorisation requise', camera ? 'Autorise l’appareil photo pour prendre une photo.' : 'Autorise la photothèque pour envoyer une photo.');
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.65 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.65 });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.base64) return;
      setSendingMedia(true);
      await sendMedia({
        data_url: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`,
        file_name: asset.fileName ?? 'photo.jpg',
        caption: messageText.trim() || undefined,
        mention_user_ids: mentionIds,
        reply_to_id: replyingTo?.id,
      });
      setMessageText(''); setMentionIds([]); setReplyingTo(null);
    } catch (error) {
      Alert.alert('Photo non envoyée', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally { setSendingMedia(false); }
  };

  const openAttachments = () => Alert.alert('Ajouter au message', undefined, [
    { text: 'Prendre une photo', onPress: () => void sendPickedImage(true) },
    { text: 'Choisir une photo', onPress: () => void sendPickedImage(false) },
    { text: 'Annuler', style: 'cancel' },
  ]);

  const toggleRecording = async () => {
    try {
      if (!recorderState.isRecording) {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) return Alert.alert('Microphone requis', 'Autorise le microphone pour envoyer un message vocal.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        return;
      }
      const duration = recorderState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri || duration < 300) return;
      setSendingMedia(true);
      const base64 = await new File(recorder.uri).base64();
      await sendMedia({ data_url: `data:audio/mp4;base64,${base64}`, file_name: 'vocal.m4a', duration_ms: duration, reply_to_id: replyingTo?.id });
      setReplyingTo(null);
    } catch (error) {
      Alert.alert('Vocal non envoyé', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally { setSendingMedia(false); }
  };

  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis >= 180_000) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void toggleRecording();
    }
    // toggleRecording deliberately uses the latest recorder state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.durationMillis, recorderState.isRecording]);

  const confirmDelete = (message: Message) => {
    const allowed = message.userId === currentUserId || user?.role === 'coach' || user?.role === 'admin';
    if (!allowed) return;
    Alert.alert('Supprimer ce message ?', 'Il disparaîtra pour tous les membres.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteMessage(message.id) },
    ]);
  };

  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex((item) => item.id === messageId);
    if (index < 0) return;
    setHighlightedMessageId(messageId);
    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setTimeout(() => setHighlightedMessageId((current) => current === messageId ? null : current), 2200);
  };

  useEffect(() => {
    if (!targetMessageId || messages.length === 0 || focusedTargetRef.current === targetMessageId) return;
    focusedTargetRef.current = targetMessageId;
    const timer = setTimeout(() => scrollToMessage(targetMessageId), 120);
    return () => clearTimeout(timer);
    // scrollToMessage intentionally follows the latest loaded messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, targetMessageId]);

  const startReply = (message: Message) => {
    setSelectedMessage(null);
    setEditingMessage(null);
    setReplyingTo(message);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const startEdit = (message: Message) => {
    setSelectedMessage(null);
    setReplyingTo(null);
    setEditingMessage(message);
    setMessageText(message.body);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const copyMessage = async (message: Message) => {
    if (message.body) await Clipboard.setStringAsync(message.body);
    setSelectedMessage(null);
  };

  const headerComponent = (
    <>
      <View style={styles.dateLine}>
        <Text style={styles.dateStamp}>AUJOURD’HUI</Text>
      </View>

      {/* Private channel notice */}
      {isCoachs && (
        <View style={styles.privateNotice}>
          <Ionicons name="lock-closed" size={14} color={t.textDim} />
          <Text style={styles.privateText}>SALON PRIVÉ — accès restreint aux coachs</Text>
        </View>
      )}

      {/* Annonces pinned notice */}
      {isAnnonces && (
        <View style={styles.pinned}>
          <Text style={styles.pinnedLabel}>ÉPINGLÉ · ANNONCES DOJO</Text>
          <Text style={styles.pinnedText}>
            Retrouvez ici toutes les annonces officielles du club.
          </Text>
        </View>
      )}

      {loading && <ActivityIndicator color={t.crimson} style={{ marginTop: 20 }} />}
    </>
  );

  const footerComponent = (
    <>
      {/* Carpool system card for parents-enfants */}
      {isParentsEnfants && (
        <View style={styles.covCard}>
          <View style={styles.covHeader}>
            <Ionicons name="car-outline" size={14} color={t.crimson} />
            <Text style={styles.covLabel}>COVOITURAGE PROPOSÉ</Text>
          </View>
          <Text style={styles.covTitle}>Voir les covoiturages disponibles</Text>
          <Text style={styles.covSub}>Consultez la section covoiturage pour les trajets</Text>
          <View style={styles.covActions}>
            <Pressable style={styles.covBtnPrimary} onPress={() => router.navigate('/(tabs)/covoiturage')}>
              <Text style={styles.covBtnPrimaryText}>VOIR COVOITURAGES</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={{ height: 80 }} />
    </>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/(tabs)/salons')} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={[styles.chanAvatar, isAnnonces && styles.chanAvatarAnnonces]}>
            {isAnnonces
              ? <Ionicons name="sunny" size={18} color={t.bone} />
              : <Text style={styles.chanInitial}>{channelName[0]}</Text>
            }
          </View>
          <View style={styles.chanInfo}>
            <Text style={styles.chanName} numberOfLines={1}>{channelName}</Text>
            <Text style={styles.chanMeta}>
              SALON{isCoachs ? ' · PRIVÉ' : ''}
            </Text>
          </View>
          <Pressable>
            <Text style={styles.moreIcon}>···</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        automaticOffset
        style={{ flex: 1 }}
        behavior="padding"
      >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Msg
            msg={item}
            isMe={item.userId === currentUserId}
            t={t}
            msgStyles={msgStyles}
            onLongPress={() => setSelectedMessage(item)}
            highlighted={highlightedMessageId === item.id}
            activeVoiceUrl={activeVoiceUrl}
            onVoiceActivate={setActiveVoiceUrl}
            onReplyPress={scrollToMessage}
            onReactionPress={(emoji) => void toggleReaction(item.id, emoji)}
          />
        )}
        contentContainerStyle={styles.messages}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={footerComponent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true); void refetch().finally(() => setRefreshing(false));
        }} />}
        onContentSizeChange={() => {
          if (messages.length > 0 && !targetMessageId && !focusedTargetRef.current) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        onLayout={() => {
          if (messages.length > 0 && !targetMessageId) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          flatListRef.current?.scrollToOffset({ offset: Math.max(0, index * averageItemLength), animated: false });
          setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 120);
        }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      />

      {/* Composer */}
      {!isReadOnly ? (
        <>
        {mentionCandidates.length > 0 && <View style={styles.mentionPanel}>{mentionCandidates.map((member) => <Pressable key={member.id} style={styles.mentionRow} onPress={() => insertMention(member)}>
          <View style={styles.mentionAvatar}><Text style={styles.mentionAvatarText}>{member.firstName[0]}{member.lastName[0]}</Text></View>
          <Text style={styles.mentionName}>{member.firstName} {member.lastName}</Text>
        </Pressable>)}</View>}
        <SafeAreaView edges={['bottom']} style={styles.composerSafe}>
          {(replyingTo || editingMessage) && (
            <View style={styles.composerContext}>
              <View style={styles.composerContextBar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.composerContextTitle}>{editingMessage ? 'MODIFICATION' : `RÉPONSE À ${replyingTo?.profiles ? `${replyingTo.profiles.first_name} ${replyingTo.profiles.last_name}` : 'UN MESSAGE'}`}</Text>
                <Text style={styles.composerContextBody} numberOfLines={1}>{(editingMessage ?? replyingTo)?.body || ((editingMessage ?? replyingTo)?.messageType === 'audio' ? '🎤 Message vocal' : '📷 Photo')}</Text>
              </View>
              <Pressable accessibilityLabel="Annuler" onPress={() => { setReplyingTo(null); setEditingMessage(null); if (editingMessage) setMessageText(''); }}>
                <Ionicons name="close" size={18} color={t.textMute} />
              </Pressable>
            </View>
          )}
          <View style={styles.composer}>
          <Pressable style={styles.attachBtn} onPress={openAttachments} disabled={sendingMedia || recorderState.isRecording}>
            <Text style={styles.attachIcon}>＋</Text>
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Écrire un message…"
            placeholderTextColor={t.textMute}
            value={messageText}
            onChangeText={setMessageText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            blurOnSubmit={false}
          />
          <Pressable style={[styles.sendBtn, recorderState.isRecording && styles.recordingBtn, sendingMedia && styles.sendBtnDisabled]} onPress={messageText.trim() ? handleSend : toggleRecording} disabled={sendingMedia}>
            {sendingMedia ? <ActivityIndicator size="small" color={t.bone} /> : recorderState.isRecording
              ? <Text style={styles.recordingTime}>{Math.ceil(recorderState.durationMillis / 1000)}s ■</Text>
              : <Ionicons name={messageText.trim() ? 'send' : 'mic'} size={17} color={t.bone} />}
          </Pressable>
          </View>
        </SafeAreaView>
        </>
      ) : (
        <SafeAreaView edges={['bottom']} style={styles.readOnlyBar}>
          <Text style={styles.readOnlyText}>Ce salon est en lecture seule</Text>
        </SafeAreaView>
      )}
      </KeyboardAvoidingView>

      <Modal visible={Boolean(selectedMessage)} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityLabel="Fermer le menu" style={StyleSheet.absoluteFill} onPress={() => setSelectedMessage(null)} />
          <View style={styles.messageMenu}>
            <View style={styles.quickReactions}>
              {['❤️', '👍', '🔥', '😂', '😮', '🙏'].map((emoji) => (
                <Pressable key={emoji} style={styles.quickReaction} onPress={() => {
                  if (selectedMessage) void toggleReaction(selectedMessage.id, emoji);
                  setSelectedMessage(null);
                }}><Text style={styles.quickReactionText}>{emoji}</Text></Pressable>
              ))}
            </View>
            <Pressable style={styles.menuAction} onPress={() => selectedMessage && startReply(selectedMessage)}>
              <Ionicons name="arrow-undo-outline" size={19} color={t.bone} /><Text style={styles.menuActionText}>Répondre</Text>
            </Pressable>
            {selectedMessage?.body ? <Pressable style={styles.menuAction} onPress={() => selectedMessage && void copyMessage(selectedMessage)}>
              <Ionicons name="copy-outline" size={19} color={t.bone} /><Text style={styles.menuActionText}>Copier</Text>
            </Pressable> : null}
            {canEditSelected ? (
              <Pressable style={styles.menuAction} onPress={() => selectedMessage && startEdit(selectedMessage)}>
                <Ionicons name="pencil-outline" size={19} color={t.bone} /><Text style={styles.menuActionText}>Modifier</Text>
              </Pressable>
            ) : null}
            {(selectedMessage?.userId === currentUserId || user?.role === 'coach' || user?.role === 'admin') ? (
              <Pressable style={styles.menuAction} onPress={() => { const message = selectedMessage; setSelectedMessage(null); if (message) confirmDelete(message); }}>
                <Ionicons name="trash-outline" size={19} color={t.crimson} /><Text style={[styles.menuActionText, { color: t.crimson }]}>Supprimer</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
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
    privateText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 1 },
    pinned: {
      marginHorizontal: 16, marginTop: 12, marginBottom: 6, padding: 10,
      backgroundColor: 'rgba(200,54,45,0.08)', borderWidth: 1, borderColor: 'rgba(200,54,45,0.3)',
      borderRadius: 3,
    },
    pinnedLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.crimson, letterSpacing: 1.5, marginBottom: 4 },
    pinnedText: { fontFamily: FONTS.body, fontSize: 12.5, color: t.bone, lineHeight: 18 },
    messages: { paddingHorizontal: 16, paddingTop: 8 },
    dateLine: { alignItems: 'center', marginVertical: 8 },
    dateStamp: {
      fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 2,
      paddingHorizontal: 10, paddingVertical: 3,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 2,
    },
    covCard: {
      padding: 12, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairlineStrong, borderStyle: 'dashed', borderRadius: 3,
      marginTop: 14,
    },
    covHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
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
    composerSafe: {
      backgroundColor: t.ink, borderTopWidth: 1, borderTopColor: t.hairline,
    },
    composerContext: {
      minHeight: 48, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 10,
      flexDirection: 'row', alignItems: 'center', gap: 9,
      backgroundColor: t.surface, borderRadius: 8,
    },
    composerContextBar: { width: 3, alignSelf: 'stretch', marginVertical: 7, borderRadius: 2, backgroundColor: t.crimson },
    composerContextTitle: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
    composerContextBody: { color: t.textDim, fontFamily: FONTS.body, fontSize: 11, marginTop: 2 },
    composer: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
      backgroundColor: t.ink,
    },
    attachBtn: {
      width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: t.hairlineStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    attachIcon: { color: t.bone, fontSize: 18, lineHeight: 20 },
    input: {
      flex: 1, minHeight: 36, maxHeight: 92, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 8, fontFamily: FONTS.body, fontSize: 13, color: t.bone,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: t.crimson,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: t.elevated },
    sendIcon: { color: t.bone, fontSize: 14 },
    recordingBtn: { width: 62, borderRadius: 18, backgroundColor: '#D63A31' },
    recordingTime: { color: '#fff', fontFamily: FONTS.mono, fontSize: 10, fontWeight: '800' },
    mentionPanel: { marginHorizontal: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 6, overflow: 'hidden' },
    mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.hairline },
    mentionAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.elevated, alignItems: 'center', justifyContent: 'center' },
    mentionAvatarText: { color: t.bone, fontFamily: FONTS.display, fontSize: 10, fontWeight: '900' },
    mentionName: { color: t.bone, fontFamily: FONTS.body, fontSize: 13, fontWeight: '600' },
    menuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    messageMenu: { backgroundColor: t.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, borderWidth: 1, borderColor: t.hairlineStrong },
    quickReactions: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: t.elevated, borderRadius: 24, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12 },
    quickReaction: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    quickReactionText: { fontSize: 23 },
    menuAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline, paddingHorizontal: 6 },
    menuActionText: { color: t.bone, fontFamily: FONTS.body, fontSize: 14, fontWeight: '600' },
    readOnlyBar: {
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
      backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.hairline,
      alignItems: 'center',
    },
    readOnlyText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5 },
  });
}
