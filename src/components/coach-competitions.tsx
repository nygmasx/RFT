import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
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
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ESPACE COACH · ÉQUIPE</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.title}>COMPÉTITIONS</Text>
          </View>
          <Pressable accessibilityLabel="Créer une compétition" style={styles.createButton} onPress={() => router.push('/admin-content' as never)}>
            <Ionicons name="add" size={22} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <Summary value={upcoming.length} label="À VENIR" styles={styles} />
          <Summary value={totalRegistrations} label="INSCRITS" styles={styles} />
          <Summary value={pendingCount} label="À VALIDER" accent={pendingCount > 0} styles={styles} last />
        </View>

        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'upcoming' && styles.tabActive]} onPress={() => setTab('upcoming')}><Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>À PILOTER ({upcoming.length})</Text></Pressable>
          <Pressable style={[styles.tab, tab === 'past' && styles.tabActive]} onPress={() => setTab('past')}><Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>ARCHIVES ({past.length})</Text></Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={t.crimson} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.crimson} onRefresh={() => {
            setRefreshing(true); void refetch().finally(() => setRefreshing(false));
          }} />}
        >
          {pendingCount > 0 ? (
            <Pressable style={styles.pendingBanner} onPress={() => router.push('/admin-results' as never)}>
              <View style={styles.pendingIcon}><Ionicons name="alert-circle" size={20} color={t.crimson} /></View>
              <View style={styles.pendingCopy}><Text style={styles.pendingTitle}>{pendingCount} RÉSULTAT{pendingCount > 1 ? 'S' : ''} À VALIDER</Text><Text style={styles.pendingText}>Vérifier les résultats envoyés par les élèves.</Text></View>
              <Text style={styles.pendingAction}>VOIR →</Text>
            </Pressable>
          ) : null}

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{tab === 'upcoming' ? 'SUIVI DE L’ÉQUIPE' : 'SAISIE DES RÉSULTATS'}</Text>
            <Text style={styles.listHint}>TOUCHER POUR GÉRER</Text>
          </View>

          {visible.map((competition) => {
            const date = displayDate(competition.comp_date);
            const missingResults = tab === 'past' && competition.registered_count > competition.result_count;
            return (
              <Pressable key={competition.id} style={styles.card} onPress={() => openManagement(competition)}>
                <View style={styles.cardMain}>
                  <View style={styles.dateBlock}><Text style={styles.dateMonth}>{date.month}</Text><Text style={styles.dateDay}>{date.day}</Text><Text style={styles.dateYear}>{date.year}</Text></View>
                  <View style={styles.cardCopy}>
                    <View style={styles.tags}>
                      {competition.comp_type ? <Text style={styles.typeTag}>{competition.comp_type}</Text> : null}
                      {competition.pending_result_count > 0 ? <Text style={styles.pendingTag}>{competition.pending_result_count} À VALIDER</Text> : null}
                      {missingResults ? <Text style={styles.missingTag}>RÉSULTATS INCOMPLETS</Text> : null}
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
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={34} color={t.textMute} />
              <Text style={styles.emptyTitle}>{tab === 'upcoming' ? 'AUCUNE COMPÉTITION À VENIR' : 'AUCUNE ARCHIVE'}</Text>
              <Text style={styles.emptyText}>{tab === 'upcoming' ? 'Crée une compétition pour commencer à gérer les inscriptions de l’équipe.' : 'Les compétitions passées apparaîtront ici.'}</Text>
              {tab === 'upcoming' ? <Pressable style={styles.emptyButton} onPress={() => router.push('/admin-content' as never)}><Text style={styles.emptyButtonText}>CRÉER UNE COMPÉTITION</Text></Pressable> : null}
            </View>
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
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
    eyebrow: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 2 },
    title: { color: t.bone, fontFamily: FONTS.display, fontSize: 39, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
    createButton: { width: 40, height: 40, borderRadius: 3, backgroundColor: t.crimson, alignItems: 'center', justifyContent: 'center' },
    summary: { marginHorizontal: 20, flexDirection: 'row', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3 },
    summaryCell: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: t.hairline },
    summaryCellLast: { borderRightWidth: 0 },
    summaryValue: { color: t.bone, fontFamily: FONTS.display, fontSize: 22, fontWeight: '900' },
    summaryValueAccent: { color: t.crimson },
    summaryLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 0.8, marginTop: 3 },
    tabs: { marginTop: 14, paddingHorizontal: 20, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.hairline },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
    tabActive: { borderBottomColor: t.crimson },
    tabText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    tabTextActive: { color: t.bone },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 10 },
    pendingBanner: { minHeight: 68, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.crimson + '12', borderWidth: 1, borderColor: t.crimson + '77', borderRadius: 3 },
    pendingIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson + '18' },
    pendingCopy: { flex: 1 },
    pendingTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
    pendingText: { color: t.textMute, fontSize: 10, marginTop: 3 },
    pendingAction: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '800' },
    listHeader: { marginTop: 7, paddingVertical: 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listTitle: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.5 },
    listHint: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7 },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3, overflow: 'hidden' },
    cardMain: { minHeight: 108, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateBlock: { width: 52, minHeight: 68, alignItems: 'center', justifyContent: 'center', backgroundColor: t.ink, borderWidth: 1, borderColor: t.hairline },
    dateMonth: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1 },
    dateDay: { color: t.crimson, fontFamily: FONTS.display, fontSize: 27, fontWeight: '900', lineHeight: 29 },
    dateYear: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1 },
    cardCopy: { flex: 1, minWidth: 0 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
    typeTag: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 7.5, fontWeight: '800', letterSpacing: 0.8, borderWidth: 1, borderColor: t.crimson, paddingHorizontal: 5, paddingVertical: 2 },
    pendingTag: { color: t.gold, fontFamily: FONTS.mono, fontSize: 7.5, fontWeight: '800', letterSpacing: 0.6 },
    missingTag: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
    name: { color: t.bone, fontFamily: FONTS.display, fontSize: 16, fontWeight: '900', lineHeight: 18 },
    locationRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
    location: { flex: 1, color: t.textMute, fontSize: 10.5 },
    counts: { minHeight: 46, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: t.hairline },
    count: { paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderRightWidth: 1, borderRightColor: t.hairline },
    countValue: { color: t.bone, fontFamily: FONTS.display, fontSize: 14, fontWeight: '900' },
    countText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.5 },
    manage: { flex: 1, paddingHorizontal: 10, alignItems: 'flex-end', justifyContent: 'center' },
    manageText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
    empty: { marginTop: 20, padding: 34, alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3 },
    emptyTitle: { marginTop: 12, color: t.bone, fontFamily: FONTS.display, fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
    emptyText: { marginTop: 6, color: t.textMute, fontSize: 11, lineHeight: 16, textAlign: 'center' },
    emptyButton: { marginTop: 16, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson, borderRadius: 3 },
    emptyButtonText: { color: '#FFF', fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  });
}
