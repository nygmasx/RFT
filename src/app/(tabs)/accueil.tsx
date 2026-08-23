import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { CoachHome } from '@/components/coach-home';
import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useChannels } from '@/hooks/useChannels';
import { useNotifications } from '@/hooks/useNotifications';
import { useRankingsPreview } from '@/hooks/useRankingsPreview';

function Tag({ text, filled, color, size = 9, t }: {
  text: string; filled?: boolean; color?: string; size?: number; t: Theme;
}) {
  const c = color ?? t.crimson;
  return (
    <View style={[tagS(t).wrap, { borderColor: c, backgroundColor: filled ? c : 'transparent' }]}>
      <Text style={[tagS(t).text, { color: filled ? t.ink : c, fontSize: size }]}>{text}</Text>
    </View>
  );
}

function tagS(t: Theme) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderRadius: 2 },
    text: { fontFamily: FONTS.mono, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  });
}

const EVENT_COLORS: Record<string, string> = {
  cours: '#3B82F6',
  stage: '#C9A24B',
  compet: '#C8362D',
};

const EVENT_LABELS: Record<string, string> = {
  cours: 'COURS',
  stage: 'STAGE',
  compet: 'COMPÉT.',
};

function formatEventDate(iso: string) {
  if (!iso) return { day: '—', monthLabel: '—' };
  const [, mm, dd] = iso.split('-');
  const day = dd ?? '';
  const monthNum = parseInt(mm ?? '1', 10);
  const monthLabels = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
  const monthLabel = monthLabels[monthNum - 1] ?? '';
  return { day, monthLabel };
}

export default function AccueilScreen() {
  const { user } = useAuth();
  const isCoach = user?.role === 'coach' || user?.role === 'admin';
  return isCoach ? <CoachHome /> : <MemberAccueilScreen />;
}

function MemberAccueilScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [refreshing, setRefreshing] = useState(false);
  const { data: announcements, loading: loadingAnn, refetch: refetchAnnouncements } = useAnnouncements();
  const { unreadCount, refetch: refetchNotifications } = useNotifications();
  const { data: calendarEvents, loading: loadingCal, refetch: refetchCalendar } = useCalendarEvents();
  const { data: channels, loading: loadingChan, refetch: refetchChannels } = useChannels();
  const { data: rankingPreview, loading: loadingRankings, refetch: refetchRankings } = useRankingsPreview();

  const loading = loadingAnn || loadingCal || loadingChan;

  const hero = announcements[0];
  const second = announcements[1];
  const upcomingPreview = calendarEvents.slice(0, 3);
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
  }).toUpperCase();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View>
          <Text style={styles.date}>{todayLabel}</Text>
          <Text style={styles.title}>DOJO</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={18} color={t.bone} />
          </Pressable>
          <Pressable style={styles.notifBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={18} color={t.bone} />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.crimson} onRefresh={() => {
          setRefreshing(true); void Promise.all([refetchAnnouncements(), refetchNotifications(), refetchCalendar(), refetchChannels(), refetchRankings()]).finally(() => setRefreshing(false));
        }} />}>

          {/* Hero announcement */}
          {hero && (
            <Pressable style={styles.hero} onPress={() => router.push(`/announcement?id=${hero.id}`)}>
              <View style={styles.heroTexture} />
              <View style={styles.heroGradient} />
              <View style={styles.heroTags}>
                {hero.tag && <Tag text={hero.tag} filled color={t.crimson} t={t} />}
                {hero.pinned && <Tag text="ÉPINGLÉ" color={t.bone} t={t} />}
              </View>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{hero.title}</Text>
                <Text style={styles.heroSub}>
                  {hero.profiles ? `${hero.profiles.first_name} ${hero.profiles.last_name}` : ''}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Second announcement */}
          {second && (
            <Pressable style={styles.secondCard} onPress={() => router.push(`/announcement?id=${second.id}`)}>
              <View style={styles.secondLeft}>
                <View style={styles.secondTagWrap}>
                  {second.tag && <Tag text={second.tag} filled color={t.crimson} size={8} t={t} />}
                </View>
                <Text style={styles.secondTitle}>{second.title}</Text>
                <Text style={styles.secondSub}>
                  {second.profiles ? `${second.profiles.first_name} ${second.profiles.last_name}` : ''}
                </Text>
              </View>
            </Pressable>
          )}

          <Pressable style={styles.clubCard} onPress={() => router.push('/club' as never)}>
            <View style={styles.clubIcon}><Ionicons name="people" size={20} color="#FFF" /></View>
            <View style={styles.clubCopy}>
              <Text style={styles.clubTitle}>MON CLUB</Text>
              <Text style={styles.clubSub}>Planning · inscriptions · adhésion · documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.crimson} />
          </Pressable>

          {/* À venir section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>À VENIR</Text>
            <Pressable onPress={() => router.push('/calendar')}>
              <Text style={styles.sectionAction}>TOUT VOIR →</Text>
            </Pressable>
          </View>

          <View style={styles.eventList}>
            {upcomingPreview.map((e, i) => {
              const accent = e.type === 'compet';
              const color = EVENT_COLORS[e.type] ?? t.textDim;
              const label = EVENT_LABELS[e.type] ?? e.type.toUpperCase();
              const { day, monthLabel } = formatEventDate((e as any).eventDate ?? (e as any).event_date ?? '');

              return (
                <Pressable key={i} style={[styles.eventRow, accent && styles.eventRowAccent]} onPress={() => router.push('/calendar')}>
                  <View style={styles.eventDate}>
                    <Text style={[styles.eventDay, { color: accent ? t.crimson : t.bone }]}>{day}</Text>
                    <Text style={styles.eventMonth}>{monthLabel}</Text>
                  </View>
                  <View style={styles.eventDivider} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    <Text style={styles.eventSub}>
                      {((e as any).eventTime ?? (e as any).event_time) ?? ''}{((e as any).eventTime ?? (e as any).event_time) && e.place ? ' · ' : ''}{e.place ?? ''}
                    </Text>
                  </View>
                  <Tag text={label} color={color} size={9} t={t} />
                </Pressable>
              );
            })}
          </View>

          {/* Classements preview */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.sectionLabel}>CLASSEMENTS RFT</Text>
            <Pressable onPress={() => router.push('/rankings' as never)}>
              <Text style={styles.sectionAction}>TOUT VOIR →</Text>
            </Pressable>
          </View>

          <Pressable style={styles.rankingCard} onPress={() => router.push('/rankings' as never)}>
            <View style={styles.rankingHeader}>
              <View style={styles.rankingIcon}>
                <Ionicons name="podium" size={19} color={t.gold} />
              </View>
              <View style={styles.rankingHeading}>
                <Text style={styles.rankingTitle}>POUND-FOR-POUND</Text>
                <Text style={styles.rankingSubtitle}>CLASSEMENT DU CLUB · RÉSULTATS VALIDÉS</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.crimson} />
            </View>

            {loadingRankings ? (
              <View style={styles.rankingLoading}>
                <ActivityIndicator size="small" color={t.crimson} />
              </View>
            ) : rankingPreview.length > 0 ? rankingPreview.map((row) => (
              <View key={row.userId} style={styles.rankingRow}>
                <Text style={styles.rankingRank}>{String(row.rank).padStart(2, '0')}</Text>
                {row.avatarUrl ? (
                  <Image source={{ uri: row.avatarUrl }} style={styles.rankingAvatar} contentFit="cover" />
                ) : (
                  <View style={styles.rankingAvatarFallback}>
                    <Text style={styles.rankingInitials}>{row.firstName[0]}{row.lastName[0]}</Text>
                  </View>
                )}
                <View style={styles.rankingIdentity}>
                  <Text style={styles.rankingName} numberOfLines={1}>{row.firstName} {row.lastName}</Text>
                  <Text style={styles.rankingMeta}>{row.resultCount} RÉS. · {row.wins} VICT.</Text>
                </View>
                <View style={styles.rankingScore}>
                  <Text style={styles.rankingPoints}>{row.p4pPoints}</Text>
                  <Text style={styles.rankingPointsLabel}>PTS</Text>
                </View>
              </View>
            )) : (
              <View style={styles.rankingEmpty}>
                <Text style={styles.rankingEmptyText}>Les classements apparaîtront après validation des premiers résultats.</Text>
              </View>
            )}

            <View style={styles.rankingFooter}>
              <Text style={styles.rankingFooterText}>CLUB & CLASSEMENTS OFFICIELS</Text>
              <Text style={styles.rankingFooterArrow}>ACCÉDER →</Text>
            </View>
          </Pressable>

          {/* Recent messages */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.sectionLabel}>DERNIERS MESSAGES</Text>
          </View>

          <View style={styles.messageList}>
            {channels.slice(0, 4).map((c, i) => {
              const isTop = i === 0;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.messageRow, i > 0 && styles.messageBorder]}
                  onPress={() => router.push({ pathname: '/chat', params: { channel: c.id, name: c.name } })}
                >
                  <View style={[styles.messageAvatar, isTop && styles.messageAvatarTop]}>
                    {isTop
                      ? <Ionicons name="sunny" size={18} color={t.bone} />
                      : <Text style={[styles.messageAvatarText, isTop && styles.messageAvatarTextTop]}>{c.name[0]}</Text>
                    }
                  </View>
                  <View style={styles.messageBody}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageChan}>{c.name}</Text>
                    </View>
                    <Text style={styles.messagePreview} numberOfLines={1}>
                      {c.description ?? ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
      paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8,
    },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    date: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    title: {
      fontFamily: FONTS.display, fontSize: 44, color: t.bone, fontWeight: '900',
      letterSpacing: 1, marginTop: 2,
    },
    iconBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: t.elevated,
      borderWidth: 1, borderColor: t.hairline, alignItems: 'center', justifyContent: 'center',
    },
    iconBtnText: { fontSize: 16 },
    notifBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: t.elevated,
      borderWidth: 1, borderColor: t.hairline, alignItems: 'center', justifyContent: 'center',
    },
    notifIcon: { fontSize: 16 },
    notifDot: {
      position: 'absolute', top: 6, right: 6, width: 8, height: 8,
      borderRadius: 4, backgroundColor: t.crimson, borderWidth: 2, borderColor: t.ink,
    },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20 },
    hero: {
      height: 200, borderRadius: 4, overflow: 'hidden', marginBottom: 10, position: 'relative',
    },
    heroTexture: { ...StyleSheet.absoluteFill, backgroundColor: '#2a1a16' },
    heroGradient: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,10,10,0.65)' },
    heroTags: { position: 'absolute', top: 14, left: 16, flexDirection: 'row', gap: 6 },
    heroContent: { position: 'absolute', bottom: 14, left: 16, right: 16 },
    heroTitle: {
      fontFamily: FONTS.display, fontSize: 24, color: t.bone, fontWeight: '900',
      letterSpacing: 0.5, lineHeight: 28, textTransform: 'uppercase',
    },
    heroSub: { fontFamily: FONTS.body, fontSize: 12.5, color: t.textDim, marginTop: 6 },
    secondCard: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, padding: 14, flexDirection: 'row', alignItems: 'center',
      gap: 12, marginBottom: 14,
    },
    clubCard: {
      minHeight: 68, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.crimson + '66', borderLeftWidth: 3, borderLeftColor: t.crimson,
      marginBottom: 14,
    },
    clubIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson, borderRadius: 3 },
    clubCopy: { flex: 1 },
    clubTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    clubSub: { color: t.textMute, fontSize: 10.5, marginTop: 3 },
    secondLeft: { flex: 1, minWidth: 0 },
    secondTagWrap: { marginBottom: 6 },
    secondTitle: {
      fontFamily: FONTS.display, fontSize: 14, color: t.bone, fontWeight: '900',
      letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 4,
    },
    secondSub: { fontFamily: FONTS.body, fontSize: 11, color: t.textDim },
    sectionHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 8,
    },
    sectionLabel: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    sectionAction: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, letterSpacing: 2 },
    eventList: { gap: 8 },
    eventRow: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      padding: 12, flexDirection: 'row', gap: 14, alignItems: 'center', borderRadius: 3,
      borderLeftWidth: 1,
    },
    eventRowAccent: { borderLeftWidth: 2, borderLeftColor: t.crimson },
    eventDate: { textAlign: 'center', minWidth: 36, alignItems: 'center' },
    eventDay: {
      fontFamily: FONTS.display, fontSize: 26, color: t.bone, fontWeight: '900', lineHeight: 28,
    },
    eventMonth: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginTop: 2 },
    eventDivider: { width: 1, alignSelf: 'stretch', backgroundColor: t.hairline },
    eventInfo: { flex: 1 },
    eventTitle: { fontFamily: FONTS.body, fontSize: 13.5, color: t.bone, fontWeight: '600', marginBottom: 2 },
    eventSub: { fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim },
    rankingCard: {
      overflow: 'hidden', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, borderLeftWidth: 2, borderLeftColor: t.gold,
    },
    rankingHeader: {
      minHeight: 60, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11,
      backgroundColor: t.elevated, borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    rankingIcon: {
      width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: t.gold + '66', borderRadius: 18,
    },
    rankingHeading: { flex: 1, minWidth: 0 },
    rankingTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
    rankingSubtitle: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.8, marginTop: 3 },
    rankingLoading: { height: 66, alignItems: 'center', justifyContent: 'center' },
    rankingRow: {
      minHeight: 58, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    rankingRank: { width: 24, color: t.gold, fontFamily: FONTS.display, fontSize: 16, fontWeight: '900' },
    rankingAvatar: { width: 34, height: 34, borderRadius: 17 },
    rankingAvatarFallback: {
      width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated,
    },
    rankingInitials: { color: t.bone, fontFamily: FONTS.display, fontSize: 11, fontWeight: '900' },
    rankingIdentity: { flex: 1, minWidth: 0 },
    rankingName: { color: t.bone, fontFamily: FONTS.body, fontSize: 12.5, fontWeight: '700' },
    rankingMeta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 0.5, marginTop: 3 },
    rankingScore: { alignItems: 'flex-end' },
    rankingPoints: { color: t.crimson, fontFamily: FONTS.display, fontSize: 18, fontWeight: '900' },
    rankingPointsLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 1 },
    rankingEmpty: { minHeight: 68, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
    rankingEmptyText: { color: t.textMute, fontFamily: FONTS.body, fontSize: 11, lineHeight: 16, textAlign: 'center' },
    rankingFooter: {
      paddingHorizontal: 13, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.crimson + '0D',
    },
    rankingFooterText: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 0.7 },
    rankingFooterArrow: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    messageList: { paddingTop: 4 },
    messageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    messageBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    messageAvatar: {
      width: 36, height: 36, backgroundColor: t.elevated, borderRadius: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    messageAvatarTop: { backgroundColor: t.crimson },
    messageAvatarText: { fontFamily: FONTS.display, fontSize: 16, color: t.crimson, fontWeight: '900' },
    messageAvatarTextTop: { color: t.bone },
    messageBody: { flex: 1, minWidth: 0 },
    messageHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
    messageChan: { fontFamily: FONTS.body, fontSize: 12.5, color: t.bone, fontWeight: '600', flex: 1 },
    messageRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    messageTime: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute },
    messagePreview: { fontFamily: FONTS.body, fontSize: 12, color: t.textDim, marginTop: 2 },
  });
}
