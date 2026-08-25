import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachHome } from '@/components/coach-home';
import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { Chip, EmptyState, IconButton, ScreenHeader, SectionHeading, Surface } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useChannels } from '@/hooks/useChannels';
import { useNotifications } from '@/hooks/useNotifications';
import { useRankingsPreview } from '@/hooks/useRankingsPreview';
import { CalendarEvent } from '@/lib/database.types';

const EVENT_LABELS: Record<CalendarEvent['type'], string> = {
  cours: 'Cours',
  stage: 'Stage',
  compet: 'Compétition',
};

const EVENT_TONES: Record<CalendarEvent['type'], 'info' | 'gold' | 'accent'> = {
  cours: 'info',
  stage: 'gold',
  compet: 'accent',
};

function formatEventDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
  };
}

export default function AccueilScreen() {
  const { user } = useAuth();
  const isCoach = user?.role === 'coach' || user?.role === 'admin';
  return isCoach ? <CoachHome /> : <MemberAccueilScreen />;
}

function MemberAccueilScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const { data: announcements, loading: loadingAnnouncements, refetch: refetchAnnouncements } = useAnnouncements();
  const { unreadCount, refetch: refetchNotifications } = useNotifications();
  const { data: calendarEvents, loading: loadingCalendar, refetch: refetchCalendar } = useCalendarEvents();
  const { data: channels, loading: loadingChannels, refetch: refetchChannels } = useChannels();
  const { data: rankingPreview, loading: loadingRankings, refetch: refetchRankings } = useRankingsPreview();

  const loading = loadingAnnouncements || loadingCalendar || loadingChannels;
  const hero = announcements[0];
  const second = announcements[1];
  const upcoming = calendarEvents.slice(0, 3);
  const firstName = user?.firstName?.trim() || 'Ronin';
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([
      refetchAnnouncements(),
      refetchNotifications(),
      refetchCalendar(),
      refetchChannels(),
      refetchRankings(),
    ]).finally(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          eyebrow={`${today} · Bonjour ${firstName}`}
          title="DOJO"
          action={(
            <View style={styles.headerActions}>
              <IconButton icon="calendar-outline" label="Ouvrir le calendrier" onPress={() => router.push('/calendar')} />
              <IconButton icon="notifications-outline" label="Ouvrir les notifications" badge={unreadCount > 0} onPress={() => router.push('/notifications')} />
            </View>
          )}
        />
      </SafeAreaView>

      {loading ? (
        <View accessibilityLabel="Chargement de l’accueil" style={styles.loader}>
          <ActivityIndicator color={theme.crimson} />
          <Text style={styles.loaderText}>Préparation du dojo…</Text>
        </View>
      ) : (
        <ScrollView
          alwaysBounceVertical
          bounces
          contentContainerStyle={styles.scroll}
          decelerationRate="normal"
          refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {hero ? (
              <Pressable
                accessibilityHint="Ouvre l’annonce complète"
                accessibilityRole="button"
                onPress={() => router.push(`/announcement?id=${hero.id}`)}
                style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
              >
                <View style={styles.heroGlow} />
                <View style={styles.heroRule} />
                <Image source={require('../../../assets/images/rft-mark.png')} style={styles.heroMark} contentFit="contain" />
                <View style={styles.heroTopline}>
                  <Chip label={hero.tag || 'Vie du club'} filled />
                  {hero.pinned ? <Chip label="À la une" tone="muted" /> : null}
                </View>
                <View style={styles.heroCopy}>
                  <Text numberOfLines={3} style={styles.heroTitle}>{hero.title}</Text>
                  <Text numberOfLines={2} style={styles.heroBody}>{hero.body}</Text>
                  <View style={styles.heroFooter}>
                    <Text style={styles.heroAuthor}>
                      {hero.profiles ? `${hero.profiles.first_name} ${hero.profiles.last_name}` : 'Ronin Fight Team'}
                    </Text>
                    <View style={styles.heroAction}>
                      <Text style={styles.heroActionText}>LIRE</Text>
                      <Ionicons name="arrow-forward" size={15} color="#FFF" />
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : (
              <Surface accent="crimson" style={styles.welcomeCard}>
                <View style={styles.welcomeIcon}><Image source={require('../../../assets/images/rft-mark.png')} style={styles.welcomeMark} contentFit="contain" /></View>
                <View style={styles.welcomeCopy}>
                  <Chip label="Ronin Fight Team" filled />
                  <Text style={styles.welcomeTitle}>LE DOJO EST PRÊT.</Text>
                  <Text style={styles.welcomeText}>Retrouvez ici la vie du club, vos rendez-vous et les résultats de l’équipe.</Text>
                </View>
              </Surface>
            )}

            <View style={styles.pulseRow}>
              <PulseStat value={upcoming.length} label="À VENIR" styles={styles} />
              <PulseStat value={unreadCount} label="NOUVEAUX" styles={styles} />
              <PulseStat value={channels.length} label="SALONS" styles={styles} last />
            </View>

            {second ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/announcement?id=${second.id}`)}
                style={({ pressed }) => [styles.secondaryStory, pressed && styles.pressed]}
              >
                <View style={styles.secondaryAccent} />
                <View style={styles.secondaryCopy}>
                  <Text style={styles.secondaryKicker}>{second.tag || 'DU CLUB'}</Text>
                  <Text numberOfLines={2} style={styles.secondaryTitle}>{second.title}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={theme.crimson} />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/club' as never)}
              style={({ pressed }) => [styles.clubCard, pressed && styles.pressed]}
            >
              <View style={styles.clubIcon}><Ionicons name="people" size={21} color="#FFF" /></View>
              <View style={styles.clubCopy}>
                <Text style={styles.clubEyebrow}>ESPACE MEMBRE</Text>
                <Text style={styles.clubTitle}>Mon club</Text>
                <Text numberOfLines={1} style={styles.clubText}>Planning, inscriptions, adhésion et documents</Text>
              </View>
              <View style={styles.clubArrow}><Ionicons name="chevron-forward" size={18} color={theme.bone} /></View>
            </Pressable>

            <View style={styles.section}>
              <SectionHeading title="Prochains rendez-vous" meta="L’agenda de l’équipe" actionLabel="Calendrier" onAction={() => router.push('/calendar')} />
              {upcoming.length > 0 ? (
                <Surface style={styles.eventList}>
                  {upcoming.map((event, index) => {
                    const date = formatEventDate(event.eventDate);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={event.id}
                        onPress={() => router.push('/calendar')}
                        style={({ pressed }) => [styles.eventRow, index > 0 && styles.divider, pressed && styles.pressed]}
                      >
                        <View style={styles.eventDate}>
                          <Text style={styles.eventDay}>{date.day}</Text>
                          <Text style={styles.eventMonth}>{date.month}</Text>
                        </View>
                        <View style={styles.eventCopy}>
                          <Text numberOfLines={1} style={styles.eventTitle}>{event.title}</Text>
                          <Text numberOfLines={1} style={styles.eventMeta}>
                            {[event.eventTime, event.place].filter(Boolean).join(' · ') || 'Informations à venir'}
                          </Text>
                        </View>
                        <Chip label={EVENT_LABELS[event.type]} tone={EVENT_TONES[event.type]} />
                      </Pressable>
                    );
                  })}
                </Surface>
              ) : (
                <EmptyState icon="calendar-outline" title="Agenda libre" message="Les prochains cours, stages et compétitions apparaîtront ici." actionLabel="Ouvrir le calendrier" onAction={() => router.push('/calendar')} />
              )}
            </View>

            <View style={styles.section}>
              <SectionHeading title="Classement du club" meta="Pound-for-pound · résultats validés" actionLabel="Tout voir" onAction={() => router.push('/rankings' as never)} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/rankings' as never)}
                style={({ pressed }) => [styles.rankingCard, pressed && styles.pressed]}
              >
                <View style={styles.rankingTop}>
                  <View style={styles.rankingMedal}><Ionicons name="podium" size={20} color={theme.gold} /></View>
                  <View style={styles.rankingTopCopy}>
                    <Text style={styles.rankingKicker}>RONIN LEADERBOARD</Text>
                    <Text style={styles.rankingHeading}>La forme du moment</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={theme.crimson} />
                </View>
                {loadingRankings ? (
                  <View style={styles.rankingLoading}><ActivityIndicator size="small" color={theme.crimson} /></View>
                ) : rankingPreview.length > 0 ? rankingPreview.map((row, index) => (
                  <View key={row.userId} style={[styles.rankingRow, index > 0 && styles.rankingDivider]}>
                    <Text style={styles.rankingRank}>{String(row.rank).padStart(2, '0')}</Text>
                    {row.avatarUrl ? (
                      <Image source={{ uri: row.avatarUrl }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <View style={styles.avatarFallback}><Text style={styles.avatarText}>{row.firstName[0]}{row.lastName[0]}</Text></View>
                    )}
                    <View style={styles.rankingIdentity}>
                      <Text numberOfLines={1} style={styles.rankingName}>{row.firstName} {row.lastName}</Text>
                      <Text style={styles.rankingMeta}>{row.wins} victoire{row.wins > 1 ? 's' : ''} · {row.resultCount} résultat{row.resultCount > 1 ? 's' : ''}</Text>
                    </View>
                    <Text style={styles.rankingPoints}>{row.p4pPoints}<Text style={styles.rankingPointsUnit}> pts</Text></Text>
                  </View>
                )) : (
                  <View style={styles.rankingEmpty}><Text style={styles.rankingEmptyText}>Le classement apparaîtra après les premiers résultats validés.</Text></View>
                )}
              </Pressable>
            </View>

            <View style={styles.section}>
              <SectionHeading title="Salons du club" meta="Les espaces où l’équipe échange" actionLabel="Ouvrir" onAction={() => router.push('/(tabs)/salons')} />
              {channels.length > 0 ? (
                <Surface style={styles.channelList}>
                  {channels.slice(0, 4).map((channel, index) => (
                    <Pressable
                      accessibilityRole="button"
                      key={channel.id}
                      onPress={() => router.push({ pathname: '/chat', params: { channel: channel.id, name: channel.name } })}
                      style={({ pressed }) => [styles.channelRow, index > 0 && styles.divider, pressed && styles.pressed]}
                    >
                      <View style={[styles.channelAvatar, index === 0 && styles.channelAvatarAccent]}>
                        <Text style={styles.channelInitial}>{channel.name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={styles.channelCopy}>
                        <Text style={styles.channelName}>{channel.name}</Text>
                        <Text numberOfLines={1} style={styles.channelDescription}>{channel.description || 'Échanges du club'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color={theme.textMute} />
                    </Pressable>
                  ))}
                </Surface>
              ) : (
                <EmptyState icon="chatbubbles-outline" title="Aucun salon visible" message="Les salons ouverts à votre profil apparaîtront ici." />
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function PulseStat({ value, label, last, styles }: { value: number; label: string; last?: boolean; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.pulseStat, last && styles.pulseStatLast]}>
      <Text style={styles.pulseValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.pulseLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.ink },
    headerActions: { flexDirection: 'row', gap: 8 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loaderText: { color: theme.textDim, fontSize: 13 },
    scroll: { paddingBottom: 28 },
    content: { width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: Layout.gutter },
    pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
    hero: {
      minHeight: 276,
      overflow: 'hidden',
      padding: 18,
      backgroundColor: '#241310',
      borderRadius: Radii.xl,
      borderWidth: 1,
      borderColor: `${theme.crimson}66`,
    },
    heroGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, right: -110, top: -82, backgroundColor: `${theme.crimson}4D` },
    heroRule: { position: 'absolute', width: 180, height: 8, right: -20, top: 92, backgroundColor: theme.crimson, transform: [{ rotate: '-18deg' }] },
    heroMark: { position: 'absolute', width: 230, height: 230, right: -66, bottom: -35, opacity: 0.22 },
    heroTopline: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
    heroCopy: { flex: 1, justifyContent: 'flex-end', maxWidth: '90%', paddingTop: 56 },
    heroTitle: { color: '#FFF', fontFamily: FONTS.display, fontSize: 28, fontWeight: '900', lineHeight: 31, letterSpacing: -0.5, textTransform: 'uppercase' },
    heroBody: { color: '#D9CEC8', fontSize: 13, lineHeight: 18, marginTop: 9 },
    heroFooter: { marginTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    heroAuthor: { flex: 1, color: '#AFA19A', fontSize: 11, fontWeight: '600' },
    heroAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroActionText: { color: '#FFF', fontFamily: FONTS.mono, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    welcomeCard: { minHeight: 230, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 18 },
    welcomeIcon: { position: 'absolute', width: 220, height: 220, right: -40, bottom: -40, opacity: 0.22 },
    welcomeMark: { width: '100%', height: '100%' },
    welcomeCopy: { maxWidth: '76%' },
    welcomeTitle: { color: theme.bone, fontFamily: FONTS.display, fontSize: 28, fontWeight: '900', marginTop: 16 },
    welcomeText: { color: theme.textDim, fontSize: 13, lineHeight: 19, marginTop: 8 },
    pulseRow: { minHeight: 72, marginTop: 10, flexDirection: 'row', backgroundColor: theme.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: theme.hairline },
    pulseStat: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.hairline },
    pulseStatLast: { borderRightWidth: 0 },
    pulseValue: { color: theme.bone, fontFamily: FONTS.display, fontSize: 21, fontWeight: '900' },
    pulseLabel: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
    secondaryStory: { minHeight: 74, marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: theme.hairline },
    secondaryAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: theme.crimson },
    secondaryCopy: { flex: 1, minWidth: 0 },
    secondaryKicker: { color: theme.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    secondaryTitle: { color: theme.bone, fontSize: 14, fontWeight: '800', lineHeight: 18, marginTop: 5 },
    clubCard: { minHeight: 92, marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: theme.elevated, borderRadius: Radii.lg, borderWidth: 1, borderColor: theme.hairlineStrong },
    clubIcon: { width: 50, height: 50, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.crimson },
    clubCopy: { flex: 1, minWidth: 0 },
    clubEyebrow: { color: theme.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    clubTitle: { color: theme.bone, fontFamily: FONTS.display, fontSize: 19, fontWeight: '900', marginTop: 2 },
    clubText: { color: theme.textDim, fontSize: 11, marginTop: 3 },
    clubArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
    section: { marginTop: 24 },
    eventList: { overflow: 'hidden' },
    eventRow: { minHeight: 78, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    divider: { borderTopWidth: 1, borderTopColor: theme.hairline },
    eventDate: { width: 40, alignItems: 'center' },
    eventDay: { color: theme.bone, fontFamily: FONTS.display, fontSize: 24, fontWeight: '900', lineHeight: 25 },
    eventMonth: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1 },
    eventCopy: { flex: 1, minWidth: 0 },
    eventTitle: { color: theme.bone, fontSize: 13, fontWeight: '800' },
    eventMeta: { color: theme.textDim, fontSize: 11, marginTop: 4 },
    rankingCard: { overflow: 'hidden', backgroundColor: theme.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: `${theme.gold}55` },
    rankingTop: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.elevated },
    rankingMedal: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: `${theme.gold}17`, borderWidth: 1, borderColor: `${theme.gold}44` },
    rankingTopCopy: { flex: 1, minWidth: 0 },
    rankingKicker: { color: theme.gold, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    rankingHeading: { color: theme.bone, fontFamily: FONTS.display, fontSize: 17, fontWeight: '900', marginTop: 3 },
    rankingLoading: { minHeight: 72, alignItems: 'center', justifyContent: 'center' },
    rankingRow: { minHeight: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
    rankingDivider: { borderTopWidth: 1, borderTopColor: theme.hairline },
    rankingRank: { width: 22, color: theme.gold, fontFamily: FONTS.display, fontSize: 16, fontWeight: '900' },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    avatarFallback: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.elevated },
    avatarText: { color: theme.bone, fontSize: 11, fontWeight: '900' },
    rankingIdentity: { flex: 1, minWidth: 0 },
    rankingName: { color: theme.bone, fontSize: 13, fontWeight: '800' },
    rankingMeta: { color: theme.textMute, fontSize: 10, marginTop: 3 },
    rankingPoints: { color: theme.crimson, fontFamily: FONTS.display, fontSize: 17, fontWeight: '900' },
    rankingPointsUnit: { color: theme.textMute, fontSize: 9 },
    rankingEmpty: { minHeight: 78, padding: 18, alignItems: 'center', justifyContent: 'center' },
    rankingEmptyText: { color: theme.textDim, fontSize: 12, textAlign: 'center' },
    channelList: { overflow: 'hidden' },
    channelRow: { minHeight: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
    channelAvatar: { width: 38, height: 38, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.elevated },
    channelAvatarAccent: { backgroundColor: theme.crimson },
    channelInitial: { color: theme.bone, fontFamily: FONTS.display, fontSize: 15, fontWeight: '900' },
    channelCopy: { flex: 1, minWidth: 0 },
    channelName: { color: theme.bone, fontSize: 13, fontWeight: '800' },
    channelDescription: { color: theme.textDim, fontSize: 11, marginTop: 3 },
  });
}
