import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useChannels } from '@/hooks/useChannels';

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
  const [, mm, dd] = iso.split('-');
  const day = dd ?? '';
  const monthNum = parseInt(mm ?? '1', 10);
  const monthLabels = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
  const monthLabel = monthLabels[monthNum - 1] ?? '';
  return { day, monthLabel };
}

export default function AccueilScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { data: announcements, loading: loadingAnn } = useAnnouncements();
  const { data: calendarEvents, loading: loadingCal } = useCalendarEvents();
  const { data: channels, loading: loadingChan } = useChannels();

  const loading = loadingAnn || loadingCal || loadingChan;

  const hero = announcements[0];
  const second = announcements[1];
  const upcomingPreview = calendarEvents.slice(0, 3);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View>
          <Text style={styles.date}>MER. 27 MAI 2026</Text>
          <Text style={styles.title}>DOJO</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/calendar')}>
            <Ionicons name="calendar-outline" size={18} color={t.bone} />
          </Pressable>
          <Pressable style={styles.notifBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={18} color={t.bone} />
            <View style={styles.notifDot} />
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

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
              const { day, monthLabel } = formatEventDate(e.event_date);

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
                      {e.event_time ?? ''}{e.event_time && e.place ? ' · ' : ''}{e.place ?? ''}
                    </Text>
                  </View>
                  <Tag text={label} color={color} size={9} t={t} />
                </Pressable>
              );
            })}
          </View>

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
