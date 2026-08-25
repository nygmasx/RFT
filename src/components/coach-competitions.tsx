import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { Chip, EmptyState, IconButton, ScreenHeader, SectionHeading, SegmentedControl } from '@/components/ui/rft-ui';
import { useTheme } from '@/context/ThemeContext';
import { CoachCompetitionOverview, useCoachOverview } from '@/hooks/useCoachOverview';

type CoachCompetitionTab = 'upcoming' | 'past';

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
    year: String(date.getFullYear()).slice(2),
  };
}

export function CoachCompetitions() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<CoachCompetitionTab>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const { competitions, pendingResults, loading, refetch } = useCoachOverview();
  const today = new Date().toISOString().split('T')[0] ?? '';
  const upcoming = competitions.filter(({ comp_date }) => comp_date >= today).sort((a, b) => a.comp_date.localeCompare(b.comp_date));
  const past = competitions.filter(({ comp_date }) => comp_date < today).sort((a, b) => b.comp_date.localeCompare(a.comp_date));
  const visible = tab === 'upcoming' ? upcoming : past;
  const totalRegistrations = upcoming.reduce((sum, row) => sum + row.registered_count, 0);
  const pendingCount = pendingResults.length;

  const openManagement = (competition: CoachCompetitionOverview) => {
    router.push({ pathname: '/admin-results', params: { competitionId: competition.id } });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          eyebrow="ESPACE COACH · ÉQUIPE"
          title="COMPÉTITIONS"
          action={<IconButton icon="add" label="Créer une compétition" accent onPress={() => router.push('/admin-content' as never)} />}
        />

        <View style={styles.summary}>
          <Summary value={upcoming.length} label="À VENIR" styles={styles} />
          <Summary value={totalRegistrations} label="INSCRITS" styles={styles} />
          <Summary value={pendingCount} label="À VALIDER" accent={pendingCount > 0} styles={styles} last />
        </View>

        <SegmentedControl
          items={[`À piloter · ${upcoming.length}`, `Archives · ${past.length}`]}
          selectedIndex={tab === 'upcoming' ? 0 : 1}
          onChange={(index) => setTab(index === 0 ? 'upcoming' : 'past')}
        />
      </SafeAreaView>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={t.crimson} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); void refetch().finally(() => setRefreshing(false));
          }} />}
        >
          {pendingCount > 0 ? (
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.pendingBanner, pressed && styles.pressed]} onPress={() => router.push('/admin-results' as never)}>
              <View style={styles.pendingIcon}><Ionicons name="alert-circle" size={20} color={t.crimson} /></View>
              <View style={styles.pendingCopy}><Text style={styles.pendingTitle}>{pendingCount} RÉSULTAT{pendingCount > 1 ? 'S' : ''} À VALIDER</Text><Text style={styles.pendingText}>Vérifier les résultats envoyés par les élèves.</Text></View>
              <Ionicons name="chevron-forward" size={18} color={t.crimson} />
            </Pressable>
          ) : null}

          <SectionHeading
            title={tab === 'upcoming' ? 'Suivi de l’équipe' : 'Saisie des résultats'}
            meta={`${tab === 'upcoming' ? 'PROCHAINS OBJECTIFS' : 'SAISON ÉCOULÉE'} · TOUCHEZ POUR GÉRER`}
          />

          {visible.map((competition) => {
            const date = displayDate(competition.comp_date);
            const missingResults = tab === 'past' && competition.registered_count > competition.result_count;
            return (
              <Pressable key={competition.id} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => openManagement(competition)}>
                <View style={styles.cardMain}>
                  <View style={styles.dateBlock}><Text style={styles.dateMonth}>{date.month}</Text><Text style={styles.dateDay}>{date.day}</Text><Text style={styles.dateYear}>{date.year}</Text></View>
                  <View style={styles.cardCopy}>
                    <View style={styles.tags}>
                      {competition.comp_type ? <Chip label={competition.comp_type} /> : null}
                      {competition.pending_result_count > 0 ? <Chip label={`${competition.pending_result_count} à valider`} tone="warning" /> : null}
                      {missingResults ? <Chip label="Résultats incomplets" tone="muted" /> : null}
                    </View>
                    <Text numberOfLines={2} style={styles.name}>{competition.name.toUpperCase()}</Text>
                    <View style={styles.locationRow}><Ionicons name="location-outline" size={11} color={t.textMute} /><Text numberOfLines={1} style={styles.location}>{competition.location || 'Lieu à compléter'}</Text></View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textMute} />
                </View>
                <View style={styles.counts}>
                  <Count icon="people-outline" value={competition.registered_count} label="INSCRITS" color={t.textMute} styles={styles} />
                  <Count icon="medal-outline" value={competition.result_count} label="RÉSULTATS" color={t.textMute} styles={styles} />
                  <View style={styles.manage}><Text style={styles.manageText}>GÉRER L’ÉQUIPE →</Text></View>
                </View>
              </Pressable>
            );
          })}

          {visible.length === 0 ? (
            <EmptyState
              icon="trophy-outline"
              title={tab === 'upcoming' ? 'Aucune compétition à venir' : 'Aucune archive'}
              message={tab === 'upcoming' ? 'Créez une compétition pour commencer à gérer les inscriptions de l’équipe.' : 'Les compétitions passées apparaîtront ici.'}
              actionLabel={tab === 'upcoming' ? 'Créer une compétition' : undefined}
              onAction={tab === 'upcoming' ? () => router.push('/admin-content' as never) : undefined}
            />
          ) : null}
          <View style={{ height: 26 }} />
        </ScrollView>
      )}
    </View>
  );
}

function Summary({ value, label, accent, last, styles }: { value: number; label: string; accent?: boolean; last?: boolean; styles: ReturnType<typeof makeStyles> }) {
  return <View style={[styles.summaryCell, last && styles.summaryCellLast]}><Text style={[styles.summaryValue, accent && styles.summaryValueAccent]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function Count({ icon, value, label, color, styles }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; color: string; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.count}><Ionicons name={icon} size={13} color={color} /><Text style={styles.countValue}>{value}</Text><Text style={styles.countText}>{label}</Text></View>;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    summary: { marginHorizontal: 20, marginBottom: 14, flexDirection: 'row', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, overflow: 'hidden' },
    summaryCell: { flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: t.hairline },
    summaryCellLast: { borderRightWidth: 0 },
    summaryValue: { color: t.bone, fontFamily: FONTS.display, fontSize: 22, fontWeight: '900' },
    summaryValueAccent: { color: t.crimson },
    summaryLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 0.8, marginTop: 3 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
    pendingBanner: { minHeight: 78, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.crimson + '12', borderWidth: 1, borderColor: t.crimson + '77', borderRadius: Radii.lg },
    pendingIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson + '18' },
    pendingCopy: { flex: 1 },
    pendingTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
    pendingText: { color: t.textMute, fontFamily: FONTS.body, fontSize: 11.5, marginTop: 3 },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, overflow: 'hidden' },
    cardMain: { minHeight: 118, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 },
    dateBlock: { width: 58, minHeight: 78, alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md },
    dateMonth: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1 },
    dateDay: { color: t.crimson, fontFamily: FONTS.display, fontSize: 27, fontWeight: '900', lineHeight: 29 },
    dateYear: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1 },
    cardCopy: { flex: 1, minWidth: 0 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
    name: { color: t.bone, fontFamily: FONTS.display, fontSize: 16, fontWeight: '900', lineHeight: 18 },
    locationRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
    location: { flex: 1, color: t.textMute, fontSize: 10.5 },
    counts: { minHeight: Layout.touchTarget, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: t.hairline },
    count: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRightWidth: 1, borderRightColor: t.hairline },
    countValue: { color: t.bone, fontFamily: FONTS.display, fontSize: 14, fontWeight: '900' },
    countText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.5 },
    manage: { flex: 1, paddingHorizontal: 10, alignItems: 'flex-end', justifyContent: 'center' },
    manageText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
    pressed: { opacity: 0.72, transform: [{ scale: 0.992 }] },
  });
}
