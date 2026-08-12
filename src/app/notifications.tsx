import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { AppNotification, useNotifications } from '@/hooks/useNotifications';
import { safeBack } from '@/lib/navigation';

const TAG_COLORS: Record<string, string> = {
  'COMPÉTITION': '#C8362D',
  'ENTRAINEMENT': '#3B82F6',
  'STAGE': '#C9A24B',
  'IMPORTANT': '#C8362D',
  'INFO': '#4A8F6D',
  'MESSAGE': '#3B82F6',
  'CALENDAR': '#C9A24B',
  'CARPOOL': '#4A8F6D',
  'ANNOUNCEMENT': '#C8362D',
  'COMPETITION': '#C8362D',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function NotificationsScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { data: notifications, loading, markAllRead, markRead, unreadCount } = useNotifications();

  const openNotification = (item: AppNotification) => {
    const data = item.data ?? {};
    if (data.announcementId) router.push({ pathname: '/announcement', params: { id: data.announcementId } });
    else if (data.channelId) router.push({ pathname: '/chat', params: { channel: data.channelId, name: data.channelName ?? 'Salon' } });
    else if (data.competitionId) router.push({ pathname: '/competition-detail', params: { id: data.competitionId } });
    else if (item.type === 'calendar') router.push('/calendar');
    else if (item.type === 'carpool') router.push('/(tabs)/covoiturage');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/(tabs)/accueil')} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>NOTIFICATIONS</Text>
          <Pressable
            style={styles.readAllBtn}
            onPress={() => void markAllRead()}
            disabled={unreadCount === 0}
          >
            <Text style={[styles.readAllText, unreadCount === 0 && styles.readAllTextDisabled]}>TOUT LIRE</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={44} color={t.textMute} />
          <Text style={styles.emptyText}>Aucune notification</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionLabel}>ACTIVITÉ DU CLUB</Text>

          {notifications.map((item, i) => {
            const tag = item.type.toUpperCase();
            const tagColor = TAG_COLORS[tag] ?? t.crimson;
            const icon = item.type === 'message' ? 'chatbubble-outline'
              : item.type === 'competition' ? 'trophy-outline'
              : item.type === 'calendar' ? 'calendar-outline'
              : item.type === 'carpool' ? 'car-outline' : 'megaphone-outline';

            return (
              <Pressable
                key={item.id}
                style={[styles.card, !item.isRead && styles.cardUnread, i > 0 && styles.cardBorder]}
                onPress={() => {
                  void markRead(item.id).catch(() => {});
                  openNotification(item);
                }}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: tagColor + '18' }]}>
                    <Ionicons
                      name={icon}
                      size={18}
                      color={tagColor}
                    />
                  </View>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={[styles.tag, { borderColor: tagColor }]}>
                      <Text style={[styles.tagText, { color: tagColor }]}>{tag}</Text>
                    </View>
                    <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardAuthor} numberOfLines={2}>{item.body}</Text>
                </View>

                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontFamily: FONTS.body, fontSize: 14, color: t.textMute },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4, width: 36 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    title: {
      fontFamily: FONTS.display, fontSize: 14, color: t.bone,
      fontWeight: '900', letterSpacing: 2,
    },
    readAllBtn: { width: 64, alignItems: 'flex-end', paddingVertical: 8 },
    readAllText: { fontFamily: FONTS.mono, fontSize: 8, color: t.crimson, letterSpacing: 1 },
    readAllTextDisabled: { color: t.textMute },

    scroll: { paddingHorizontal: 20, paddingTop: 20 },
    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute,
      letterSpacing: 2, marginBottom: 12,
    },

    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingVertical: 14,
    },
    cardUnread: { backgroundColor: t.surface, marginHorizontal: -10, paddingHorizontal: 10 },
    cardBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    cardLeft: { alignItems: 'center', gap: 4 },
    iconWrap: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
    pinnedDot: {
      width: 6, height: 6, borderRadius: 3,
    },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.crimson },
    cardBody: { flex: 1 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    tag: {
      paddingHorizontal: 6, paddingVertical: 2,
      borderWidth: 1, borderRadius: 2,
    },
    tagText: { fontFamily: FONTS.mono, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
    cardTime: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 0.5 },
    cardTitle: {
      fontFamily: FONTS.body, fontSize: 13.5, color: t.bone,
      fontWeight: '700', lineHeight: 18, marginBottom: 3,
    },
    cardAuthor: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 0.5 },
    chevron: { fontSize: 20, color: t.textMute, lineHeight: 22 },
  });
}
