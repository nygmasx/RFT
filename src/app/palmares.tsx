import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, DetailHeader, EmptyState, IconButton } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { safeBack } from '@/lib/navigation';

const MEDALS: Record<number, { color: string; label: string; name: string }> = {
  1: { color: '#D4A436', label: '1ER', name: 'OR' },
  2: { color: '#BFC4C7', label: '2E',  name: 'ARG' },
  3: { color: '#C07A3A', label: '3E',  name: 'BR' },
};

function MedalDisc({ place, size = 36, t }: { place: number; size?: number; t: Theme }) {
  const m = MEDALS[place];
  const styles = useMemo(() => discSt(t), [t]);
  if (!m) {
    return (
      <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.elevated }]}>
        <Text style={styles.topLabel}>T{place}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: m.color }]}>
      <Text style={[styles.label, { fontSize: size > 36 ? 13 : 11 }]}>{m.label}</Text>
    </View>
  );
}

function discSt(t: Theme) {
  return StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.5)' },
    label: { color: '#1a0e0b', fontWeight: '900', fontFamily: FONTS.display },
    topLabel: { color: t.textDim, fontSize: 10, fontWeight: '700' },
  });
}

const YEAR_FILTERS = ['Toutes', '2026', '2025', '2024'];
const RESULT_LABELS: Record<string, string> = {
  champion: '1ER', finalist: '2E', semifinal: '1/2', quarterfinal: '1/4',
  round_of_16: '1/8', round_of_32: '1/16', participant: 'PART.',
};

export default function PalmaresScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [activeYear, setActiveYear] = useState('Toutes');

  const { profile, palmares, loading } = useProfile();
  const approvedPalmares = palmares.filter((result) => result.validationStatus === 'approved');

  const filteredResults = activeYear === 'Toutes'
    ? palmares
    : palmares.filter((r) => r.compDate.startsWith(activeYear));

  const allYears = Array.from(new Set(palmares.map((r) => r.compDate.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  const yearsToShow = activeYear === 'Toutes' ? allYears : [activeYear];

  const medalCounts = approvedPalmares.reduce((counts, result) => {
    if (result.resultStage === 'champion') counts.gold += 1;
    else if (result.resultStage === 'finalist') counts.silver += 1;
    else if (result.resultStage === 'semifinal') counts.bronze += 1;
    else if (result.resultStage === 'quarterfinal') counts.top4 += 1;
    return counts;
  }, { gold: 0, silver: 0, bronze: 0, top4: 0 });

  const SUMMARY = [
    { place: 1, count: medalCounts.gold, custom: undefined as string | undefined },
    { place: 2, count: medalCounts.silver, custom: undefined as string | undefined },
    { place: 3, count: medalCounts.bronze, custom: undefined as string | undefined },
    { place: 4, count: medalCounts.top4, custom: 'TOP 4' as string | undefined },
  ];

  const authorName = profile
    ? `${profile.firstName?.toUpperCase() ?? ''} ${profile.lastName?.toUpperCase() ?? ''}`.trim() || '—'
    : '—';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <DetailHeader
          eyebrow={authorName}
          title="PALMARÈS"
          onBack={() => safeBack('/(tabs)/profil')}
          action={<IconButton accent icon="add" label="Ajouter un résultat" onPress={() => router.push('/add-result')} />}
        />
      </SafeAreaView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Season header */}
          <Text style={styles.season}>SAISON · {approvedPalmares.length} RÉSULTATS VALIDÉS</Text>

          <Pressable style={styles.rankingButton} onPress={() => router.push('/rankings' as never)}>
            <View><Text style={styles.rankingTitle}>CLASSEMENTS DU CLUB</Text><Text style={styles.rankingSubtitle}>PAR CEINTURE & POUND-FOR-POUND</Text></View>
            <Text style={styles.rankingArrow}>→</Text>
          </Pressable>

          {/* Medal counts */}
          <View style={styles.summaryRow}>
            {SUMMARY.map((it, i) => (
              <View key={i} style={styles.summaryCard}>
                <MedalDisc place={it.place} size={32} t={t} />
                <Text style={styles.summaryCount}>{it.count}</Text>
                <Text style={styles.summaryName}>
                  {it.custom ?? (MEDALS[it.place]?.name ?? `T${it.place}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Year filter */}
          <View style={styles.filterRow}>
            {YEAR_FILTERS.map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, activeYear === f && styles.filterChipActive]}
                onPress={() => setActiveYear(f)}
              >
                <Text style={[styles.filterText, activeYear === f && styles.filterTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>

          {filteredResults.length === 0 ? (
            <EmptyState icon="medal-outline" title="Aucun résultat" message="Ajoute une compétition pour commencer ton palmarès." actionLabel="AJOUTER UN RÉSULTAT" onAction={() => router.push('/add-result')} />
          ) : null}

          {/* Results by year */}
          {yearsToShow.map((yr) => {
            const items = filteredResults.filter((r) => r.compDate.startsWith(yr));
            if (!items.length) return null;
            return (
              <View key={yr}>
                <View style={styles.yearHeader}>
                  <Text style={styles.yearLabel}>{yr}</Text>
                  <View style={styles.yearLine} />
                  <Text style={styles.yearCount}>{items.length} COMPÉT.</Text>
                </View>
                {items.map((r, i) => (
                  <Pressable key={i} style={[styles.resultRow, i > 0 && styles.resultBorder]}>
                    <View style={styles.resultDisc}>
                      <MedalDisc place={r.place} size={36} t={t} />
                      {r.resultStage !== 'champion' && r.resultStage !== 'finalist' && r.resultStage !== 'semifinal' ? <Text style={styles.stageOverlay}>{RESULT_LABELS[r.resultStage]}</Text> : null}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{r.competitionName}</Text>
                      <Text style={styles.resultMeta}>{r.compDate} · {r.weightClass ?? ''}</Text>
                    </View>
                    {r.compType && <Chip label={r.compType} tone="accent" />}
                    {r.validationStatus !== 'approved' ? <View style={[styles.validationBadge, r.validationStatus === 'rejected' && styles.validationRejected]}><Text style={styles.validationText}>{r.validationStatus === 'pending' ? 'À VALIDER' : 'REFUSÉ'}</Text></View> : null}
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
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
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: Layout.gutter, paddingTop: 8 },
    season: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2, marginBottom: 10 },
    rankingButton: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 14, backgroundColor: t.crimson, borderRadius: Radii.lg },
    rankingTitle: { color: '#FFF', fontFamily: FONTS.display, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    rankingSubtitle: { color: '#FFFFFFAA', fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1, marginTop: 3 },
    rankingArrow: { color: '#FFF', fontSize: 24 },
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    summaryCard: {
      flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: Radii.md, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 6,
    },
    summaryCount: { fontFamily: FONTS.display, fontSize: 24, color: t.bone, fontWeight: '900', lineHeight: 26 },
    summaryName: { fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1.5 },
    filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    filterChip: {
      flex: 1, minHeight: 38, paddingVertical: 7, borderRadius: Radii.round, borderWidth: 1, borderColor: t.hairline,
      alignItems: 'center',
    },
    filterChipActive: { backgroundColor: t.bone, borderColor: t.bone },
    filterText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, fontWeight: '600' },
    filterTextActive: { color: t.ink },
    yearHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, marginTop: 14 },
    yearLabel: { fontFamily: FONTS.display, fontSize: 18, color: t.crimson, fontWeight: '900', letterSpacing: 1 },
    yearLine: { flex: 1, height: 1, backgroundColor: t.hairlineStrong },
    yearCount: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    resultBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    resultInfo: { flex: 1, minWidth: 0 },
    resultDisc: { alignItems: 'center', justifyContent: 'center' },
    stageOverlay: { position: 'absolute', color: t.textDim, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800' },
    validationBadge: { paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: t.gold, borderRadius: Radii.round },
    validationRejected: { borderColor: t.crimson },
    validationText: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 7.5, fontWeight: '800' },
    resultName: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700' },
    resultMeta: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1, marginTop: 2 },
    chevron: { fontSize: 18, color: t.textMute, lineHeight: 20 },
  });
}
