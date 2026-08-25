import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { IconButton, ScreenHeader, SectionHeading } from '@/components/ui/rft-ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCoachOverview } from '@/hooks/useCoachOverview';
import { useNotifications } from '@/hooks/useNotifications';

type CoachAction = {
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: '/admin' | '/admin-results' | '/admin-content' | '/admin-timer' | '/admin-club';
  accent?: boolean;
};

const ACTIONS: CoachAction[] = [
  { label: 'CLUB', detail: 'Cours, présences & adhésions', icon: 'business-outline', route: '/admin-club', accent: true },
  { label: 'ÉLÈVES', detail: 'Demandes & profils', icon: 'people-outline', route: '/admin' },
  { label: 'COMPÉTITIONS', detail: 'Inscrits & résultats', icon: 'trophy-outline', route: '/admin-results' },
  { label: 'CONTENU', detail: 'Annonces & événements', icon: 'megaphone-outline', route: '/admin-content' },
  { label: 'TIMER', detail: 'Lancer une séance', icon: 'timer-outline', route: '/admin-timer' },
];

const EVENT_LABELS: Record<string, string> = { cours: 'COURS', stage: 'STAGE', compet: 'COMPÉT.' };
const EVENT_COLORS: Record<string, string> = { cours: '#3B82F6', stage: '#C9A24B', compet: '#C8362D' };

function shortDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
  };
}

export function CoachHome() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [refreshing, setRefreshing] = useState(false);
  const { members, competitions, pendingResults, loading, refetch } = useCoachOverview();
  const { data: events, loading: calendarLoading, refetch: refetchCalendar } = useCalendarEvents();
  const { unreadCount, refetch: refetchNotifications } = useNotifications();

  const today = new Date().toISOString().split('T')[0] ?? '';
  const pendingMembers = members.filter(({ status, role }) => status === 'pending' && role === 'member');
  const activeMembers = members.filter(({ status, role }) => status === 'approved' && role === 'member');
  const upcomingCompetitions = competitions.filter(({ comp_date }) => comp_date >= today);
  const upcomingRegistrations = upcomingCompetitions.reduce((sum, competition) => sum + competition.registered_count, 0);
  const upcomingEvents = events.filter(({ eventDate }) => eventDate >= today).slice(0, 3);
  const attentionCount = pendingMembers.length + pendingResults.length;
  const firstName = user?.firstName?.trim() || 'Coach';

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([refetch(), refetchCalendar(), refetchNotifications()]).finally(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <ScreenHeader
          eyebrow={`ESPACE COACH · ${firstName.toUpperCase()}`}
          title="PILOTAGE"
          action={<IconButton icon="notifications-outline" label="Notifications" badge={unreadCount > 0} onPress={() => router.push('/notifications')} />}
        />
      </SafeAreaView>

      {loading || calendarLoading ? (
        <View style={styles.loader}><ActivityIndicator color={t.crimson} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <Pressable
            style={[styles.attentionCard, attentionCount === 0 && styles.attentionCardClear]}
            onPress={() => router.push(attentionCount > 0 && pendingMembers.length === 0 ? '/admin-results' as never : '/admin' as never)}
          >
            <View style={[styles.attentionIcon, attentionCount === 0 && styles.attentionIconClear]}>
              <Ionicons name={attentionCount > 0 ? 'alert-circle' : 'checkmark-circle'} size={24} color={attentionCount > 0 ? t.crimson : '#4A8F6D'} />
            </View>
            <View style={styles.attentionCopy}>
              <Text style={styles.attentionLabel}>{attentionCount > 0 ? 'ACTION REQUISE' : 'TOUT EST À JOUR'}</Text>
              <Text style={styles.attentionText}>
                {attentionCount > 0
                  ? `${pendingMembers.length} adhésion${pendingMembers.length > 1 ? 's' : ''} · ${pendingResults.length} résultat${pendingResults.length > 1 ? 's' : ''} à valider`
                  : 'Aucune adhésion ni aucun résultat en attente.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMute} />
          </Pressable>

          <View style={styles.metrics}>
            <Metric value={activeMembers.length} label="ÉLÈVES ACTIFS" t={t} styles={styles} />
            <Metric value={upcomingCompetitions.length} label="COMPÉT. À VENIR" t={t} styles={styles} />
            <Metric value={upcomingRegistrations} label="INSCRIPTIONS" t={t} styles={styles} last />
          </View>

          <SectionHeading title="Outils coach" meta="Les commandes essentielles du club" />
          <View style={styles.actions}>
            {ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                style={[styles.actionCard, action.accent && styles.actionCardAccent]}
                onPress={() => router.push(action.route as never)}
              >
                <View style={[styles.actionIcon, action.accent && styles.actionIconAccent]}>
                  <Ionicons name={action.icon} size={20} color={action.accent ? '#FFF' : t.crimson} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionDetail}>{action.detail}</Text>
              </Pressable>
            ))}
          </View>

          <SectionHeading title="Prochains rendez-vous" meta="Planning de l'équipe" actionLabel="Calendrier" onAction={() => router.push('/calendar')} />
          <View style={styles.agenda}>
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => {
              const date = shortDate(event.eventDate);
              const color = EVENT_COLORS[event.type] ?? t.textMute;
              return (
                <Pressable key={event.id} style={styles.eventRow} onPress={() => router.push('/calendar')}>
                  <View style={styles.eventDate}><Text style={styles.eventDay}>{date.day}</Text><Text style={styles.eventMonth}>{date.month}</Text></View>
                  <View style={[styles.eventBar, { backgroundColor: color }]} />
                  <View style={styles.eventCopy}>
                    <Text numberOfLines={1} style={styles.eventTitle}>{event.title}</Text>
                    <Text numberOfLines={1} style={styles.eventMeta}>{[event.eventTime, event.place].filter(Boolean).join(' · ') || 'Détails à compléter'}</Text>
                  </View>
                  <Text style={[styles.eventType, { color }]}>{EVENT_LABELS[event.type] ?? event.type.toUpperCase()}</Text>
                </Pressable>
              );
            }) : (
              <Pressable style={styles.emptyAgenda} onPress={() => router.push('/admin')}>
                <Ionicons name="calendar-outline" size={20} color={t.textMute} />
                <Text style={styles.emptyAgendaText}>Aucun rendez-vous programmé. Ajouter un événement.</Text>
              </Pressable>
            )}
          </View>

          {pendingResults.slice(0, 2).map((result) => (
            <Pressable
              key={result.id}
              style={styles.pendingResult}
              onPress={() => router.push({ pathname: '/admin-results', params: result.competitionId ? { competitionId: result.competitionId } : {} })}
            >
              <Ionicons name="trophy-outline" size={17} color={t.gold} />
              <View style={styles.pendingResultCopy}>
                <Text style={styles.pendingResultName}>{result.firstName} {result.lastName}</Text>
                <Text numberOfLines={1} style={styles.pendingResultMeta}>{result.competitionName} · À VALIDER</Text>
              </View>
              <Text style={styles.pendingResultAction}>OUVRIR →</Text>
            </Pressable>
          ))}

          <View style={{ height: 28 }} />
        </ScrollView>
      )}
    </View>
  );
}

function Metric({ value, label, last, styles }: { value: number; label: string; last?: boolean; t: Theme; styles: ReturnType<typeof makeStyles> }) {
  return <View style={[styles.metric, last && styles.metricLast]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: { paddingHorizontal: 2 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: Layout.gutter },
    attentionCard: { minHeight: 84, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.crimson + '12', borderWidth: 1, borderColor: t.crimson + '88', borderLeftWidth: 4, borderLeftColor: t.crimson, borderRadius: Radii.lg },
    attentionCardClear: { backgroundColor: '#4A8F6D12', borderColor: '#4A8F6D66', borderLeftColor: '#4A8F6D' },
    attentionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson + '18' },
    attentionIconClear: { backgroundColor: '#4A8F6D18' },
    attentionCopy: { flex: 1, minWidth: 0 },
    attentionLabel: { color: t.bone, fontFamily: FONTS.display, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    attentionText: { color: t.textDim, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
    metrics: { marginTop: 12, flexDirection: 'row', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, overflow: 'hidden' },
    metric: { flex: 1, minHeight: 78, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: t.hairline },
    metricLast: { borderRightWidth: 0 },
    metricValue: { color: t.bone, fontFamily: FONTS.display, fontSize: 24, fontWeight: '900' },
    metricLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.7, marginTop: 3 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionCard: { width: '48.5%', minHeight: 122, padding: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg },
    actionCardAccent: { borderColor: t.crimson + '99', backgroundColor: t.crimson + '0D' },
    actionIcon: { width: Layout.touchTarget, height: Layout.touchTarget, alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated, borderRadius: Radii.md, marginBottom: 12 },
    actionIconAccent: { backgroundColor: t.crimson },
    actionLabel: { color: t.bone, fontFamily: FONTS.display, fontSize: 12.5, fontWeight: '900', letterSpacing: 0.8 },
    actionDetail: { color: t.textMute, fontSize: 9.5, marginTop: 3 },
    agenda: { borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, overflow: 'hidden' },
    eventRow: { minHeight: 62, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.hairline },
    eventDate: { width: 34, alignItems: 'center' },
    eventDay: { color: t.bone, fontFamily: FONTS.display, fontSize: 20, fontWeight: '900', lineHeight: 21 },
    eventMonth: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 1 },
    eventBar: { width: 2, height: 28 },
    eventCopy: { flex: 1, minWidth: 0 },
    eventTitle: { color: t.bone, fontSize: 12.5, fontWeight: '700' },
    eventMeta: { color: t.textMute, fontSize: 10, marginTop: 3 },
    eventType: { fontFamily: FONTS.mono, fontSize: 7.5, fontWeight: '800', letterSpacing: 0.8 },
    emptyAgenda: { minHeight: 68, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface },
    emptyAgendaText: { flex: 1, color: t.textMute, fontSize: 11.5 },
    pendingResult: { minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.gold + '55', borderRadius: Radii.md },
    pendingResultCopy: { flex: 1, minWidth: 0 },
    pendingResultName: { color: t.bone, fontSize: 12, fontWeight: '800' },
    pendingResultMeta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, marginTop: 3 },
    pendingResultAction: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800' },
  });
}
