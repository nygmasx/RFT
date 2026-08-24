import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, type ViewToken, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
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
import { Message, MessageReceiptDetails } from '@/lib/database.types';
import { useAuth } from '@/context/AuthContext';
import { haptics } from '@/lib/haptics';

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
  onSwipeReply: (message: Message) => void;
  onPhotoPress: (url: string, fileName: string | null) => void;
  pollVotingOptionId: string | null;
  onPollVote: (messageId: string, optionId: string) => void;
}

type PendingPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
};

function Msg({ msg, isMe, t, msgStyles, onLongPress, highlighted, activeVoiceUrl, onVoiceActivate, onReplyPress, onReactionPress, onSwipeReply, onPhotoPress, pollVotingOptionId, onPollVote }: MsgProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const authorName = msg.profiles
    ? `${msg.profiles.first_name} ${msg.profiles.last_name}`
    : 'Utilisateur';
  const timeStr = new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const body = msg.body && msg.messageType !== 'poll' ? msg.body.split(/(@[\p{L}\d._-]+)/gu).map((part, index) => (
    <Text key={`${part}-${index}`} style={part.startsWith('@') ? msgStyles.mention : undefined}>{part}</Text>
  )) : null;
  const content = msg.messageType === 'poll' && msg.poll
    ? <PollBubble messageId={msg.id} question={msg.body} poll={msg.poll} styles={msgStyles} pendingOptionId={pollVotingOptionId} onVote={onPollVote} />
    : msg.messageType === 'image' && msg.mediaUrl
      ? <MessagePhoto url={msg.mediaUrl} fileName={msg.mediaFileName} styles={msgStyles} onPress={onPhotoPress} />
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
        {msg.replyTo.messageType === 'audio' ? '🎤 Message vocal' : msg.replyTo.messageType === 'image' ? '📷 Photo' : msg.replyTo.messageType === 'poll' ? `📊 ${msg.replyTo.body}` : msg.replyTo.body}
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

  const message = isMe ? (
      <Pressable style={[msgStyles.meWrap, highlighted && msgStyles.highlighted]} onLongPress={onLongPress}>
        <View style={msgStyles.meBubble}>
          {reply}
          {content}
          {body ? <Text style={msgStyles.meText}>{body}</Text> : null}
        </View>
        {reactions}
        <Text style={msgStyles.meMeta}>{timeStr}{edited} · {msg.readCount > 0 ? `LU ${msg.readCount}/${msg.recipientCount}` : 'DISTRIBUÉ'}</Text>
      </Pressable>
  ) : (
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

  return (
    <Swipeable
      ref={swipeableRef}
      friction={1.8}
      leftThreshold={46}
      dragOffsetFromLeftEdge={14}
      overshootLeft={false}
      containerStyle={msgStyles.swipeContainer}
      renderLeftActions={() => (
        <View style={msgStyles.swipeReplyAction}>
          <View style={msgStyles.swipeReplyIcon}>
            <Ionicons name="arrow-undo" size={18} color={t.bone} />
          </View>
        </View>
      )}
      onSwipeableOpen={() => {
        onSwipeReply(msg);
        swipeableRef.current?.close();
      }}
    >
      {message}
    </Swipeable>
  );
}

function PollBubble({ messageId, question, poll, styles, pendingOptionId, onVote }: {
  messageId: string;
  question: string;
  poll: NonNullable<Message['poll']>;
  styles: ReturnType<typeof makeMsgStyles>;
  pendingOptionId: string | null;
  onVote: (messageId: string, optionId: string) => void;
}) {
  return (
    <View style={styles.poll}>
      <View style={styles.pollHeading}>
        <Ionicons name="stats-chart" size={16} color="#FFD166" />
        <Text style={styles.pollQuestion}>{question}</Text>
      </View>
      <Text style={styles.pollHint}>{poll.allowsMultiple ? 'PLUSIEURS RÉPONSES POSSIBLES' : 'UNE SEULE RÉPONSE'}</Text>
      <View style={styles.pollOptions}>
        {poll.options.map((option) => {
          const percentage = poll.totalVoters > 0 ? Math.round(option.voteCount / poll.totalVoters * 100) : 0;
          const pending = pendingOptionId === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: option.voted, disabled: Boolean(pendingOptionId) }}
              style={[styles.pollOption, option.voted && styles.pollOptionSelected]}
              disabled={Boolean(pendingOptionId)}
              onPress={() => onVote(messageId, option.id)}
            >
              <View style={[styles.pollProgress, { width: `${percentage}%` }]} />
              <View style={[styles.pollCheck, option.voted && styles.pollCheckSelected]}>
                {option.voted ? <Ionicons name="checkmark" size={12} color="#111111" /> : null}
              </View>
              <Text style={styles.pollOptionLabel}>{option.label}</Text>
              {pending ? <ActivityIndicator size="small" color="#FFD166" /> : <Text style={styles.pollPercentage}>{percentage}%</Text>}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.pollTotal}>{poll.totalVoters} VOTANT{poll.totalVoters > 1 ? 'S' : ''}</Text>
    </View>
  );
}

function MessagePhoto({ url, fileName, styles, onPress }: {
  url: string;
  fileName: string | null;
  styles: ReturnType<typeof makeMsgStyles>;
  onPress: (url: string, fileName: string | null) => void;
}) {
  const [ratio, setRatio] = useState(4 / 3);
  const height = Math.min(360, Math.max(150, 268 / ratio));

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Ouvrir la photo en plein écran"
      style={styles.photoFrame}
      onPress={() => onPress(url, fileName)}
    >
      <ExpoImage
        source={{ uri: url }}
        style={[styles.photo, { height }]}
        contentFit="contain"
        transition={150}
        onLoad={({ source }) => {
          if (source.width > 0 && source.height > 0) setRatio(source.width / source.height);
        }}
      />
      <View style={styles.photoExpand}>
        <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

function PhotoViewer({ photo, onClose }: {
  photo: { url: string; fileName: string | null } | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={Boolean(photo)} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={viewerStyles.container}>
        <View style={[viewerStyles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable accessibilityLabel="Fermer la photo" hitSlop={12} style={viewerStyles.viewerButton} onPress={onClose}>
            <Ionicons name="close" size={29} color="#FFFFFF" />
          </Pressable>
          <Text style={viewerStyles.title} numberOfLines={1}>{photo?.fileName || 'Photo'}</Text>
          <View style={viewerStyles.viewerButton} />
        </View>
        <ScrollView
          style={viewerStyles.zoom}
          contentContainerStyle={viewerStyles.zoomContent}
          minimumZoomScale={1}
          maximumZoomScale={4}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          {photo ? <ExpoImage source={{ uri: photo.url }} style={{ width, height: height - 100 }} contentFit="contain" /> : null}
        </ScrollView>
        <Text style={[viewerStyles.hint, { paddingBottom: Math.max(insets.bottom, 10) }]}>PINCE POUR ZOOMER</Text>
      </View>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.16)' },
  viewerButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontFamily: FONTS.body, fontSize: 14, fontWeight: '700' },
  zoom: { flex: 1 },
  zoomContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.8, textAlign: 'center', paddingTop: 10 },
});

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
    swipeContainer: { overflow: 'visible' },
    swipeReplyAction: { width: 64, alignItems: 'center', justifyContent: 'center' },
    swipeReplyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson },
    meWrap: { alignItems: 'flex-end', width: '100%' },
    highlighted: { backgroundColor: t.crimson + '20', borderRadius: 10, padding: 6, marginHorizontal: -6 },
    meBubble: {
      backgroundColor: t.crimson, paddingHorizontal: 13, paddingVertical: 9,
      borderRadius: 16, borderBottomRightRadius: 4, maxWidth: '88%', minWidth: 68,
    },
    meText: { fontFamily: FONTS.body, fontSize: 15, color: t.bone, lineHeight: 21 },
    meMeta: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 0.8, marginTop: 4 },
    theirWrap: { flexDirection: 'row', gap: 8, width: '100%' },
    theirAvatar: {
      width: 30, height: 30, borderRadius: 3, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
    },
    theirInitial: { fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900' },
    theirMeta: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
    theirName: { fontFamily: FONTS.body, fontSize: 11.5, fontWeight: '700', color: t.bone },
    theirTime: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1 },
    theirBubble: {
      backgroundColor: t.surface, paddingHorizontal: 13, paddingVertical: 9,
      borderRadius: 16, borderTopLeftRadius: 4,
      borderWidth: 1, borderColor: t.hairline, maxWidth: '94%', minWidth: 68,
    },
    theirText: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 21, color: t.bone },
    mention: { color: '#FFD166', fontWeight: '800' },
    poll: { width: 268, maxWidth: '100%' },
    pollHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    pollQuestion: { flex: 1, color: t.bone, fontFamily: FONTS.body, fontSize: 15, lineHeight: 20, fontWeight: '800' },
    pollHint: { color: 'rgba(255,255,255,0.58)', fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 0.8, marginTop: 5 },
    pollOptions: { gap: 7, marginTop: 12 },
    pollOption: {
      minHeight: 43, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 9,
      paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.14)',
    },
    pollOptionSelected: { borderColor: '#FFD166' },
    pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,209,102,0.16)' },
    pollCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
    pollCheckSelected: { backgroundColor: '#FFD166', borderColor: '#FFD166' },
    pollOptionLabel: { flex: 1, color: t.bone, fontFamily: FONTS.body, fontSize: 13, lineHeight: 17, fontWeight: '600' },
    pollPercentage: { color: t.bone, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800' },
    pollTotal: { color: 'rgba(255,255,255,0.62)', fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1, marginTop: 9, textAlign: 'right' },
    replyQuote: { borderLeftWidth: 3, borderLeftColor: '#FFD166', backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 6, minWidth: 150 },
    replyAuthor: { color: '#FFD166', fontFamily: FONTS.body, fontSize: 10, fontWeight: '800' },
    replyBody: { color: t.bone, opacity: 0.78, fontFamily: FONTS.body, fontSize: 10, marginTop: 1 },
    reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -3, marginLeft: 8 },
    reactionsMe: { justifyContent: 'flex-end', marginRight: 8 },
    reactionChip: { borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong },
    reactionChipActive: { borderColor: t.crimson, backgroundColor: t.crimson + '24' },
    reactionText: { color: t.bone, fontFamily: FONTS.mono, fontSize: 9 },
    photoFrame: { width: 268, maxWidth: '100%', minHeight: 150, borderRadius: 11, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.22)', marginBottom: 5 },
    photo: { width: '100%', borderRadius: 11 },
    photoExpand: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.52)' },
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
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; fileName: string | null } | null>(null);
  const [receiptMessage, setReceiptMessage] = useState<Message | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<MessageReceiptDetails | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [positionedChannel, setPositionedChannel] = useState<string | null>(null);
  const [dismissedUnreadChannel, setDismissedUnreadChannel] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [newMessagesWhileAway, setNewMessagesWhileAway] = useState(0);
  const [pollComposerVisible, setPollComposerVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowsMultiple, setPollAllowsMultiple] = useState(false);
  const [sendingPoll, setSendingPoll] = useState(false);
  const [pollVotingOptionId, setPollVotingOptionId] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const { messages, members, unreadMarker, loading, sendMessage, sendMedia, createPoll, votePoll, deleteMessage, editMessage, toggleReaction, getReceiptDetails, refetch, currentUserId } = useMessages(channel);
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const focusedTargetRef = useRef<string | null>(null);
  const isNearEndRef = useRef(true);
  const showJumpToLatestRef = useRef(false);
  const renderedMessageCountRef = useRef(0);
  const renderedChannelRef = useRef(channel);
  const currentChannelRef = useRef(channel);
  const positioningTargetRef = useRef<string | null>(null);
  const [viewabilityConfig] = useState({ itemVisiblePercentThreshold: 1 });

  const requestedTargetExists = Boolean(targetMessageId && messages.some(({ id }) => id === targetMessageId));
  const positioningTarget = requestedTargetExists
    ? targetMessageId!
    : messages.at(-1)?.id ?? null;

  useLayoutEffect(() => {
    currentChannelRef.current = channel;
    positioningTargetRef.current = positioningTarget;
  }, [channel, positioningTarget]);

  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: { viewableItems: ViewToken<Message>[] }) => {
    const target = positioningTargetRef.current;
    if (target && viewableItems.some(({ isViewable, item }) => isViewable && item.id === target)) {
      setPositionedChannel(currentChannelRef.current);
    }
  });

  const channelName = name ?? 'Salon';
  const validPollOptionCount = pollOptions.filter((option) => option.trim()).length;
  const canSubmitPoll = Boolean(pollQuestion.trim() && validPollOptionCount >= 2 && !sendingPoll);

  const isAnnonces = channel === 'annonces';
  const isParentsEnfants = channel === 'parents-enfants';
  const isCoachs = channel === 'coachs';
  const isReadOnly = isAnnonces;
  const canEditSelected = Boolean(
    selectedMessage
    && selectedMessage.userId === currentUserId
    && selectedMessage.messageType === 'text',
  );
  const canViewSelectedReceipts = Boolean(
    selectedMessage
    && (selectedMessage.userId === currentUserId || user?.role === 'coach' || user?.role === 'admin'),
  );

  const updateJumpToLatestVisibility = (visible: boolean) => {
    if (showJumpToLatestRef.current === visible) return;
    showJumpToLatestRef.current = visible;
    setShowJumpToLatest(visible);
    if (!visible) setNewMessagesWhileAway(0);
  };

  const jumpToLatest = (animated = true) => {
    isNearEndRef.current = true;
    updateJumpToLatestVisibility(false);
    flatListRef.current?.scrollToEnd({ animated });
  };

  const handleSend = async () => {
    const body = messageText.trim();
    if (!body) return;
    setMessageText('');
    const selectedIds = mentionIds;
    setMentionIds([]);
    try {
      if (editingMessage) await editMessage(editingMessage.id, body);
      else await sendMessage(body, selectedIds, replyingTo?.id);
      haptics.light();
      setEditingMessage(null);
      setReplyingTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) {
      haptics.error();
      setMessageText(body);
      Alert.alert('Envoi impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    }
  };

  const mentionQuery = messageText.match(/@([\p{L}\d._-]*)$/u)?.[1]?.toLocaleLowerCase('fr-FR');
  const mentionCandidates = mentionQuery === undefined ? [] : members.filter((member) =>
    `${member.firstName} ${member.lastName}`.toLocaleLowerCase('fr-FR').includes(mentionQuery)
  ).slice(0, 5);

  const insertMention = (member: typeof members[number]) => {
    haptics.selection();
    const handle = `@${`${member.firstName}_${member.lastName}`.replace(/\s+/g, '_')}`;
    setMessageText((current) => current.replace(/@[\p{L}\d._-]*$/u, `${handle} `));
    setMentionIds((current) => current.includes(member.id) ? current : [...current, member.id]);
  };

  const pickImage = async (camera: boolean) => {
    try {
      setAttachmentMenuVisible(false);
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Autorisation requise', camera ? 'Autorise l’appareil photo pour prendre une photo.' : 'Autorise la photothèque pour envoyer une photo.');
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.8, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.8, allowsEditing: false });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      const base64 = asset.base64 ?? await new File(asset.uri).base64();
      setPendingPhoto({
        uri: asset.uri,
        base64,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? 'photo.jpg',
        width: asset.width,
        height: asset.height,
      });
      setPhotoCaption(messageText);
      haptics.selection();
    } catch (error) {
      haptics.error();
      Alert.alert('Photo indisponible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    }
  };

  const sendPendingImage = async () => {
    if (!pendingPhoto || sendingMedia) return;
    setSendingMedia(true);
    try {
      await sendMedia({
        data_url: `data:${pendingPhoto.mimeType};base64,${pendingPhoto.base64}`,
        file_name: pendingPhoto.fileName,
        caption: photoCaption.trim() || undefined,
        mention_user_ids: mentionIds,
        reply_to_id: replyingTo?.id,
      });
      setPendingPhoto(null);
      setPhotoCaption('');
      setMessageText('');
      setMentionIds([]);
      setReplyingTo(null);
      haptics.success();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) {
      haptics.error();
      Alert.alert('Photo non envoyée', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally { setSendingMedia(false); }
  };

  const openAttachments = () => {
    haptics.light();
    setAttachmentMenuVisible(true);
  };

  const openPollComposer = () => {
    setAttachmentMenuVisible(false);
    setPollComposerVisible(true);
    haptics.selection();
  };

  const closePollComposer = () => {
    setPollComposerVisible(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollAllowsMultiple(false);
  };

  const submitPoll = async () => {
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2 || sendingPoll) return;
    setSendingPoll(true);
    try {
      await createPoll({ question: pollQuestion.trim(), options, allows_multiple: pollAllowsMultiple });
      haptics.success();
      closePollComposer();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
    } catch (error) {
      haptics.error();
      Alert.alert('Sondage non créé', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally {
      setSendingPoll(false);
    }
  };

  const handlePollVote = async (messageId: string, optionId: string) => {
    if (pollVotingOptionId) return;
    setPollVotingOptionId(optionId);
    haptics.selection();
    try {
      await votePoll(messageId, optionId);
      haptics.light();
    } catch (error) {
      haptics.error();
      Alert.alert('Vote impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally {
      setPollVotingOptionId(null);
    }
  };

  const toggleRecording = async () => {
    try {
      if (!recorderState.isRecording) {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) return Alert.alert('Microphone requis', 'Autorise le microphone pour envoyer un message vocal.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        haptics.rigid();
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
      haptics.success();
    } catch (error) {
      haptics.error();
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
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        haptics.warning();
        void deleteMessage(message.id);
      } },
    ]);
  };

  const scrollToMessage = (messageId: string, animated = true) => {
    const index = messages.findIndex((item) => item.id === messageId);
    if (index < 0) return;
    setHighlightedMessageId(messageId);
    flatListRef.current?.scrollToIndex({ index, animated, viewPosition: 0.35 });
    setTimeout(() => setHighlightedMessageId((current) => current === messageId ? null : current), 2200);
  };

  useEffect(() => {
    if (!targetMessageId || messages.length === 0 || focusedTargetRef.current === targetMessageId) return;
    focusedTargetRef.current = targetMessageId;
    const timer = setTimeout(() => scrollToMessage(targetMessageId, false), 120);
    return () => clearTimeout(timer);
    // scrollToMessage intentionally follows the latest loaded messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, targetMessageId]);

  const showMissedMessages = () => {
    if (!unreadMarker?.firstUnreadMessageId) return;
    haptics.medium();
    setDismissedUnreadChannel(channel);
    scrollToMessage(unreadMarker.firstUnreadMessageId, false);
  };

  const unreadBannerVisible = Boolean(
    unreadMarker?.firstUnreadMessageId
    && unreadMarker.count > 0
    && dismissedUnreadChannel !== channel
    && positionedChannel === channel,
  );

  const startReply = (message: Message) => {
    haptics.medium();
    setSelectedMessage(null);
    setEditingMessage(null);
    setReplyingTo(message);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const startEdit = (message: Message) => {
    haptics.selection();
    setSelectedMessage(null);
    setReplyingTo(null);
    setEditingMessage(message);
    setMessageText(message.body);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const copyMessage = async (message: Message) => {
    if (message.body) await Clipboard.setStringAsync(message.body);
    haptics.selection();
    setSelectedMessage(null);
  };

  const openReceiptDetails = async (message: Message) => {
    setSelectedMessage(null);
    setReceiptMessage(message);
    setReceiptDetails(null);
    setReceiptLoading(true);
    haptics.light();
    try {
      setReceiptDetails(await getReceiptDetails(message.id));
    } catch (error) {
      setReceiptMessage(null);
      haptics.error();
      Alert.alert('Détails indisponibles', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally {
      setReceiptLoading(false);
    }
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
        behavior="translate-with-padding"
      >
      <View style={styles.messageListArea}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <>
          {item.id === unreadMarker?.firstUnreadMessageId ? (
            <View style={styles.unreadDivider}>
              <View style={styles.unreadDividerLine} />
              <Text style={styles.unreadDividerText}>NOUVEAUX MESSAGES</Text>
              <View style={styles.unreadDividerLine} />
            </View>
          ) : null}
          <Msg
              msg={item}
              isMe={item.userId === currentUserId}
              t={t}
              msgStyles={msgStyles}
              onLongPress={() => { haptics.medium(); setSelectedMessage(item); }}
              highlighted={highlightedMessageId === item.id}
              activeVoiceUrl={activeVoiceUrl}
              onVoiceActivate={setActiveVoiceUrl}
              onReplyPress={scrollToMessage}
              onReactionPress={(emoji) => { haptics.selection(); void toggleReaction(item.id, emoji); }}
              onSwipeReply={startReply}
              onPhotoPress={(url, fileName) => { haptics.light(); setViewingPhoto({ url, fileName }); }}
              pollVotingOptionId={pollVotingOptionId}
              onPollVote={(messageId, optionId) => void handlePollVote(messageId, optionId)}
            />
        </>}
        style={{ flex: 1, opacity: loading || (messages.length > 0 && positionedChannel !== channel) ? 0 : 1 }}
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
          if (renderedChannelRef.current !== channel) {
            renderedChannelRef.current = channel;
            renderedMessageCountRef.current = 0;
          }
          const previousCount = renderedMessageCountRef.current;
          renderedMessageCountRef.current = messages.length;
          if (loading) return;
          if (positionedChannel !== channel) {
            if (messages.length > 0) {
              if (!requestedTargetExists) {
                requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: false }));
              }
            } else {
              setPositionedChannel(channel);
            }
            return;
          }
          if (isNearEndRef.current) {
            const hasNewMessages = messages.length > previousCount;
            requestAnimationFrame(() => jumpToLatest(hasNewMessages));
          } else if (messages.length > previousCount) {
            setNewMessagesWhileAway((current) => current + messages.length - previousCount);
            updateJumpToLatestVisibility(true);
          }
        }}
        onLayout={() => {
          if (!loading && positionedChannel !== channel && messages.length === 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
            requestAnimationFrame(() => setPositionedChannel(channel));
          }
        }}
        onScroll={({ nativeEvent }) => {
          const distanceFromEnd = nativeEvent.contentSize.height
            - nativeEvent.layoutMeasurement.height
            - nativeEvent.contentOffset.y;
          const isNearEnd = distanceFromEnd < 120;
          isNearEndRef.current = isNearEnd;
          if (positionedChannel === channel) {
            if (isNearEnd) updateJumpToLatestVisibility(false);
            else if (distanceFromEnd > 180) updateJumpToLatestVisibility(true);
          }
        }}
        scrollEventThrottle={16}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          flatListRef.current?.scrollToOffset({ offset: Math.max(0, index * averageItemLength), animated: false });
          setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.35 }), 120);
        }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      />

      {unreadBannerVisible ? (
        <View style={styles.unreadBanner}>
          <Pressable accessibilityLabel="Voir les messages manqués" style={styles.unreadBannerMain} onPress={showMissedMessages}>
            <Ionicons name="arrow-up" size={16} color={t.bone} />
            <Text style={styles.unreadBannerText}>{unreadMarker!.count} MESSAGE{unreadMarker!.count > 1 ? 'S' : ''} MANQUÉ{unreadMarker!.count > 1 ? 'S' : ''}</Text>
            <Text style={styles.unreadBannerAction}>VOIR</Text>
          </Pressable>
          <Pressable accessibilityLabel="Masquer" hitSlop={8} style={styles.unreadBannerClose} onPress={() => setDismissedUnreadChannel(channel)}>
            <Ionicons name="close" size={17} color={t.textDim} />
          </Pressable>
        </View>
      ) : null}

      {showJumpToLatest && positionedChannel === channel ? (
        <Pressable
          accessibilityLabel="Revenir au dernier message"
          style={styles.jumpToLatest}
          onPress={() => {
            haptics.light();
            jumpToLatest(true);
          }}
        >
          {newMessagesWhileAway > 0 ? (
            <Text style={styles.jumpToLatestText}>{newMessagesWhileAway > 99 ? '99+' : newMessagesWhileAway}</Text>
          ) : null}
          <Ionicons name="arrow-down" size={20} color={t.bone} />
        </Pressable>
      ) : null}
      </View>

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
                  haptics.selection();
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
            {canViewSelectedReceipts ? (
              <Pressable style={styles.menuAction} onPress={() => selectedMessage && void openReceiptDetails(selectedMessage)}>
                <Ionicons name="information-circle-outline" size={20} color={t.bone} /><Text style={styles.menuActionText}>Infos du message</Text>
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

      <Modal visible={attachmentMenuVisible} transparent animationType="fade" onRequestClose={() => setAttachmentMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityLabel="Fermer les pièces jointes" style={StyleSheet.absoluteFill} onPress={() => setAttachmentMenuVisible(false)} />
          <SafeAreaView edges={['bottom']} style={styles.attachmentSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.attachmentTitle}>AJOUTER AU MESSAGE</Text>
            <Text style={styles.attachmentSubtitle}>Envoie une photo ou lance un sondage dans le salon.</Text>
            <View style={styles.attachmentOptions}>
              <Pressable style={styles.attachmentOption} onPress={() => void pickImage(false)}>
                <View style={[styles.attachmentOptionIcon, { backgroundColor: '#3B82F6' }]}><Ionicons name="images" size={25} color="#FFFFFF" /></View>
                <Text style={styles.attachmentOptionText}>PHOTOTHÈQUE</Text>
              </Pressable>
              <Pressable style={styles.attachmentOption} onPress={() => void pickImage(true)}>
                <View style={[styles.attachmentOptionIcon, { backgroundColor: t.crimson }]}><Ionicons name="camera" size={25} color="#FFFFFF" /></View>
                <Text style={styles.attachmentOptionText}>APPAREIL PHOTO</Text>
              </Pressable>
            </View>
            <Pressable style={styles.attachmentPollOption} onPress={openPollComposer}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: '#8B5CF6' }]}><Ionicons name="stats-chart" size={24} color="#FFFFFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachmentPollTitle}>SONDAGE</Text>
                <Text style={styles.attachmentPollSubtitle}>Pose une question et laisse le groupe voter.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textMute} />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={pollComposerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => { if (!sendingPoll) closePollComposer(); }}
      >
        <KeyboardAvoidingView style={styles.pollComposerScreen} behavior="padding" automaticOffset>
          <SafeAreaView edges={['top', 'bottom']} style={styles.pollComposerSafe}>
            <View style={styles.pollComposerHeader}>
              <Pressable disabled={sendingPoll} style={styles.pollHeaderAction} onPress={closePollComposer}>
                <Text style={styles.pollCancelText}>ANNULER</Text>
              </Pressable>
              <Text style={styles.pollComposerTitle}>NOUVEAU SONDAGE</Text>
              <Pressable disabled={!canSubmitPoll} style={styles.pollHeaderAction} onPress={() => void submitPoll()}>
                {sendingPoll ? <ActivityIndicator size="small" color={t.crimson} /> : <Text style={[styles.pollCreateText, !canSubmitPoll && styles.pollCreateTextDisabled]}>CRÉER</Text>}
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.pollComposerContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.pollFieldLabel}>QUESTION</Text>
              <TextInput
                autoFocus
                value={pollQuestion}
                onChangeText={setPollQuestion}
                placeholder="Ex. Quel jour pour l’entraînement ?"
                placeholderTextColor={t.textMute}
                style={styles.pollQuestionInput}
                maxLength={240}
                multiline
              />
              <Text style={styles.pollCharacterCount}>{pollQuestion.length}/240</Text>

              <Text style={[styles.pollFieldLabel, { marginTop: 24 }]}>CHOIX</Text>
              <View style={styles.pollOptionInputs}>
                {pollOptions.map((option, index) => (
                  <View key={`poll-option-${index}`} style={styles.pollOptionInputRow}>
                    <View style={styles.pollOptionBullet}><Text style={styles.pollOptionBulletText}>{index + 1}</Text></View>
                    <TextInput
                      value={option}
                      onChangeText={(value) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
                      placeholder={`Choix ${index + 1}`}
                      placeholderTextColor={t.textMute}
                      style={styles.pollOptionInput}
                      maxLength={120}
                      returnKeyType="next"
                    />
                    {pollOptions.length > 2 ? (
                      <Pressable accessibilityLabel={`Supprimer le choix ${index + 1}`} hitSlop={8} onPress={() => {
                        haptics.selection();
                        setPollOptions((current) => current.filter((_, itemIndex) => itemIndex !== index));
                      }}><Ionicons name="close-circle" size={21} color={t.textMute} /></Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
              {pollOptions.length < 10 ? (
                <Pressable style={styles.pollAddOption} onPress={() => {
                  haptics.selection();
                  setPollOptions((current) => [...current, '']);
                }}>
                  <Ionicons name="add" size={19} color={t.crimson} />
                  <Text style={styles.pollAddOptionText}>AJOUTER UN CHOIX</Text>
                </Pressable>
              ) : null}

              <Pressable style={styles.pollMultipleRow} onPress={() => {
                haptics.selection();
                setPollAllowsMultiple((current) => !current);
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pollMultipleTitle}>RÉPONSES MULTIPLES</Text>
                  <Text style={styles.pollMultipleSubtitle}>Les membres pourront sélectionner plusieurs choix.</Text>
                </View>
                <View style={[styles.pollToggle, pollAllowsMultiple && styles.pollToggleActive]}>
                  <View style={[styles.pollToggleThumb, pollAllowsMultiple && styles.pollToggleThumbActive]} />
                </View>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(pendingPhoto)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => !sendingMedia && setPendingPhoto(null)}>
        <KeyboardAvoidingView style={styles.photoPreview} behavior="padding" automaticOffset>
          <SafeAreaView edges={['top']} style={styles.photoPreviewHeader}>
            <Pressable accessibilityLabel="Annuler l’envoi de la photo" style={styles.photoPreviewClose} disabled={sendingMedia} onPress={() => setPendingPhoto(null)}>
              <Ionicons name="close" size={27} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.photoPreviewTitle}>APERÇU</Text>
            <View style={styles.photoPreviewClose} />
          </SafeAreaView>
          <View style={styles.photoPreviewCanvas}>
            {pendingPhoto ? (
              <ExpoImage
                source={{ uri: pendingPhoto.uri }}
                style={styles.photoPreviewImage}
                contentFit="contain"
                transition={120}
              />
            ) : null}
          </View>
          <SafeAreaView edges={['bottom']} style={styles.photoPreviewComposer}>
            {replyingTo ? (
              <View style={styles.photoReplyContext}>
                <Ionicons name="arrow-undo" size={15} color={t.crimson} />
                <Text style={styles.photoReplyText} numberOfLines={1}>Réponse à {replyingTo.profiles ? `${replyingTo.profiles.first_name} ${replyingTo.profiles.last_name}` : 'un message'}</Text>
              </View>
            ) : null}
            <View style={styles.photoCaptionRow}>
              <TextInput
                value={photoCaption}
                onChangeText={setPhotoCaption}
                placeholder="Ajouter une légende…"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.photoCaptionInput}
                multiline
                maxLength={1000}
                editable={!sendingMedia}
              />
              <Pressable accessibilityLabel="Envoyer la photo" style={styles.photoSendButton} disabled={sendingMedia} onPress={() => void sendPendingImage()}>
                {sendingMedia ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <PhotoViewer photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />

      <Modal visible={Boolean(receiptMessage)} transparent animationType="slide" onRequestClose={() => setReceiptMessage(null)}>
        <View style={styles.receiptOverlay}>
          <Pressable accessibilityLabel="Fermer les détails" style={StyleSheet.absoluteFill} onPress={() => setReceiptMessage(null)} />
          <SafeAreaView edges={['bottom']} style={styles.receiptSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.receiptHeader}>
              <View>
                <Text style={styles.receiptTitle}>INFOS DU MESSAGE</Text>
                <Text style={styles.receiptSubtitle}>{receiptMessage ? new Date(receiptMessage.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</Text>
              </View>
              <Pressable accessibilityLabel="Fermer" onPress={() => setReceiptMessage(null)}><Ionicons name="close" size={22} color={t.textDim} /></Pressable>
            </View>
            {receiptLoading ? <ActivityIndicator color={t.crimson} style={{ marginVertical: 36 }} /> : (
              <ScrollView style={styles.receiptScroll} showsVerticalScrollIndicator={false}>
                <ReceiptSection
                  title={`LU PAR (${receiptDetails?.readCount ?? 0})`}
                  icon="checkmark-done"
                  people={receiptDetails?.recipients.filter(({ status }) => status === 'read') ?? []}
                  empty="Personne ne l’a encore lu."
                  t={t}
                  styles={styles}
                />
                <ReceiptSection
                  title={`DISTRIBUÉ À (${(receiptDetails?.recipientCount ?? 0) - (receiptDetails?.readCount ?? 0)})`}
                  icon="checkmark"
                  people={receiptDetails?.recipients.filter(({ status }) => status === 'delivered') ?? []}
                  empty="Tous les destinataires ont lu le message."
                  t={t}
                  styles={styles}
                />
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function ReceiptSection({ title, icon, people, empty, t, styles }: {
  title: string;
  icon: 'checkmark-done' | 'checkmark';
  people: MessageReceiptDetails['recipients'];
  empty: string;
  t: Theme;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.receiptSection}>
      <View style={styles.receiptSectionHeader}>
        <Ionicons name={icon} size={17} color={t.crimson} />
        <Text style={styles.receiptSectionTitle}>{title}</Text>
      </View>
      {people.length === 0 ? <Text style={styles.receiptEmpty}>{empty}</Text> : people.map((person) => (
        <View key={person.id} style={styles.receiptPerson}>
          <View style={styles.receiptAvatar}><Text style={styles.receiptAvatarText}>{person.firstName[0]}{person.lastName[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.receiptName}>{person.firstName} {person.lastName}</Text>
            <Text style={styles.receiptTime}>
              {person.readAt
                ? `Lu ${new Date(person.readAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                : `Distribué ${new Date(person.distributedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`}
            </Text>
          </View>
          <Ionicons name={person.readAt ? 'checkmark-done' : 'checkmark'} size={19} color={person.readAt ? t.crimson : t.textMute} />
        </View>
      ))}
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
    messageListArea: { flex: 1 },
    messages: { paddingHorizontal: 16, paddingTop: 8 },
    unreadDivider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 4, marginBottom: 14 },
    unreadDividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.crimson },
    unreadDividerText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '800', letterSpacing: 1.2 },
    unreadBanner: {
      position: 'absolute', top: 10, left: 16, right: 16, zIndex: 20,
      minHeight: 46, flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.crimson, borderRadius: 23,
      shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8,
    },
    unreadBannerMain: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14 },
    unreadBannerText: { flex: 1, color: t.bone, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
    unreadBannerAction: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    unreadBannerClose: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
    jumpToLatest: {
      position: 'absolute', right: 16, bottom: 14, zIndex: 20,
      minWidth: 46, height: 46, paddingHorizontal: 13, borderRadius: 23,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong,
      shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    jumpToLatestText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
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
      flexDirection: 'row', alignItems: 'flex-end', gap: 9,
      paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
      backgroundColor: t.ink,
    },
    attachBtn: {
      width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: t.hairlineStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    attachIcon: { color: t.bone, fontSize: 22, lineHeight: 24 },
    input: {
      flex: 1, minHeight: 46, maxHeight: 112, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 23,
      paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
      fontFamily: FONTS.body, fontSize: 15, lineHeight: 22, color: t.bone,
    },
    sendBtn: {
      width: 42, height: 42, borderRadius: 21, backgroundColor: t.crimson,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: t.elevated },
    sendIcon: { color: t.bone, fontSize: 14 },
    recordingBtn: { width: 68, borderRadius: 21, backgroundColor: '#D63A31' },
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
    sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: t.hairlineStrong, alignSelf: 'center', marginBottom: 18 },
    attachmentSheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderWidth: 1, borderColor: t.hairlineStrong },
    attachmentTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 18, fontWeight: '900', letterSpacing: 1.2 },
    attachmentSubtitle: { color: t.textDim, fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18, marginTop: 5 },
    attachmentOptions: { flexDirection: 'row', gap: 14, marginTop: 22, marginBottom: 12 },
    attachmentOption: { flex: 1, minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 11, borderRadius: 16, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong },
    attachmentOptionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    attachmentOptionText: { color: t.bone, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    attachmentPollOption: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 16, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong, paddingHorizontal: 14, marginBottom: 12 },
    attachmentPollTitle: { color: t.bone, fontFamily: FONTS.mono, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    attachmentPollSubtitle: { color: t.textDim, fontFamily: FONTS.body, fontSize: 11.5, marginTop: 3 },
    pollComposerScreen: { flex: 1, backgroundColor: t.ink },
    pollComposerSafe: { flex: 1, backgroundColor: t.ink },
    pollComposerHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.hairline, paddingHorizontal: 8 },
    pollHeaderAction: { width: 76, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
    pollCancelText: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
    pollComposerTitle: { flex: 1, color: t.bone, textAlign: 'center', fontFamily: FONTS.display, fontSize: 15, fontWeight: '900', letterSpacing: 1.2 },
    pollCreateText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    pollCreateTextDisabled: { color: t.textMute },
    pollComposerContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
    pollFieldLabel: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginBottom: 9 },
    pollQuestionInput: { minHeight: 104, maxHeight: 160, color: t.bone, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontFamily: FONTS.body, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
    pollCharacterCount: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, textAlign: 'right', marginTop: 5 },
    pollOptionInputs: { gap: 9 },
    pollOptionInputRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 12, paddingHorizontal: 12 },
    pollOptionBullet: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson + '24', borderWidth: 1, borderColor: t.crimson },
    pollOptionBulletText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900' },
    pollOptionInput: { flex: 1, minHeight: 50, color: t.bone, fontFamily: FONTS.body, fontSize: 14, paddingVertical: 10 },
    pollAddOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
    pollAddOptionText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    pollMultipleRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 22, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 14 },
    pollMultipleTitle: { color: t.bone, fontFamily: FONTS.mono, fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
    pollMultipleSubtitle: { color: t.textDim, fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
    pollToggle: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 3, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong },
    pollToggleActive: { backgroundColor: t.crimson, borderColor: t.crimson },
    pollToggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: t.textMute },
    pollToggleThumbActive: { alignSelf: 'flex-end', backgroundColor: t.bone },
    photoPreview: { flex: 1, backgroundColor: '#050505' },
    photoPreviewHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)' },
    photoPreviewClose: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    photoPreviewTitle: { flex: 1, color: '#FFFFFF', textAlign: 'center', fontFamily: FONTS.display, fontSize: 13, fontWeight: '900', letterSpacing: 1.8 },
    photoPreviewCanvas: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10 },
    photoPreviewImage: { width: '100%', height: '100%' },
    photoPreviewComposer: { backgroundColor: 'rgba(15,15,15,0.98)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingTop: 10 },
    photoReplyContext: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: t.crimson, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 7 },
    photoReplyText: { flex: 1, color: 'rgba(255,255,255,0.72)', fontFamily: FONTS.body, fontSize: 11.5 },
    photoCaptionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    photoCaptionInput: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 11, fontFamily: FONTS.body, fontSize: 14 },
    photoSendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson },
    receiptOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
    receiptSheet: { maxHeight: '78%', minHeight: 300, backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, borderWidth: 1, borderColor: t.hairlineStrong },
    receiptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.hairline },
    receiptTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 17, fontWeight: '900', letterSpacing: 1.2 },
    receiptSubtitle: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, marginTop: 3 },
    receiptScroll: { marginHorizontal: -4 },
    receiptSection: { paddingVertical: 17 },
    receiptSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9, paddingHorizontal: 4 },
    receiptSectionTitle: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
    receiptEmpty: { color: t.textMute, fontFamily: FONTS.body, fontSize: 12.5, paddingHorizontal: 4, paddingVertical: 10 },
    receiptPerson: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline, paddingHorizontal: 4 },
    receiptAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated },
    receiptAvatarText: { color: t.bone, fontFamily: FONTS.display, fontSize: 11, fontWeight: '900' },
    receiptName: { color: t.bone, fontFamily: FONTS.body, fontSize: 13.5, fontWeight: '700' },
    receiptTime: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8.5, marginTop: 2 },
    readOnlyBar: {
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
      backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.hairline,
      alignItems: 'center',
    },
    readOnlyText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5 },
  });
}
