import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { Chip, DetailHeader, EmptyState, IconButton, SectionHeading, Surface } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { PalmaresEntry } from '@/lib/database.types';
import { haptics } from '@/lib/haptics';
import { safeBack } from '@/lib/navigation';

const MEDAL_COLORS: Record<number, string> = {
  1: '#D4A436',
  2: '#BFC4C7',
  3: '#C07A3A',
};

const STATUS_LABELS: Record<PalmaresEntry['validationStatus'], string> = {
  approved: 'Validé',
  pending: 'En attente',
  rejected: 'Refusé',
};

function placeLabel(place: number): string {
  if (place === 1) return '1ER';
  if (place === 2) return '2E';
  if (place === 3) return '3E';
  return `T${place}`;
}

export default function MonActiviteScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const { palmares, loading, refetch } = useProfile();

  const { gold, silver, bronze, pending } = useMemo(() => palmares.reduce((counts, result) => {
    if (result.place === 1) counts.gold += 1;
    else if (result.place === 2) counts.silver += 1;
    else if (result.place === 3) counts.bronze += 1;
    if (result.validationStatus === 'pending') counts.pending += 1;
    return counts;
  }, { gold: 0, silver: 0, bronze: 0, pending: 0 }), [palmares]);
  const podiums = gold + silver + bronze;
  const podiumRate = palmares.length > 0 ? Math.round((podiums / palmares.length) * 100) : 0;

  const refresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <DetailHeader
          eyebrow="Parcours sportif"
          title="MON ACTIVITÉ"
          onBack={() => safeBack('/(tabs)/profil')}
          action={<IconButton icon="add" label="Ajouter un résultat" accent onPress={() => router.push('/add-result')} />}
        />
      </SafeAreaView>

      {loading ? (
        <View style={styles.loader}>
          <View style={styles.loaderIcon}><ActivityIndicator color={theme.crimson} /></View>
          <Text style={styles.loaderText}>CHARGEMENT DE L’ACTIVITÉ</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}><Ionicons name="pulse" size={22} color={theme.onAccent} /></View>
              <Text style={styles.heroEyebrow}>SAISON EN COURS</Text>
            </View>
            <View>
              <Text style={styles.heroValue}>{String(palmares.length).padStart(2, '0')}</Text>
              <Text style={styles.heroLabel}>COMPÉTITIONS ENREGISTRÉES</Text>
            </View>
            <View style={styles.heroFooter}>
              <View>
                <Text style={styles.heroMetric}>{podiums}</Text>
                <Text style={styles.heroMetricLabel}>PODIUMS</Text>
              </View>
              <View style={styles.heroDivider} />
              <View>
                <Text style={styles.heroMetric}>{podiumRate}%</Text>
                <Text style={styles.heroMetricLabel}>TAUX DE PODIUM</Text>
              </View>
              {pending > 0 ? (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>{pending} EN ATTENTE</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeading title="Répartition" meta="Médailles obtenues" />
            <View style={styles.medalGrid}>
              {[
                { place: 1, value: gold, label: 'Or' },
                { place: 2, value: silver, label: 'Argent' },
                { place: 3, value: bronze, label: 'Bronze' },
              ].map((item) => (
                <Surface key={item.label} style={styles.medalCard}>
                  <View style={[styles.medalDisc, { backgroundColor: MEDAL_COLORS[item.place] }]}>
                    <Text style={styles.medalDiscText}>{placeLabel(item.place)}</Text>
                  </View>
                  <Text style={styles.medalValue}>{item.value}</Text>
                  <Text style={styles.medalLabel}>{item.label}</Text>
                </Surface>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeading title="Historique" meta={`${palmares.length} résultat${palmares.length > 1 ? 's' : ''}`} />
            {palmares.length === 0 ? (
              <EmptyState
                icon="medal-outline"
                title="Aucune compétition enregistrée"
                message="Ajoute ton premier résultat pour commencer à construire ton historique sportif."
                actionLabel="Ajouter un résultat"
                onAction={() => router.push('/add-result')}
              />
            ) : (
              <Surface style={styles.historyCard}>
                {palmares.map((result, index) => (
                  <ResultRow
                    index={index}
                    key={result.id}
                    result={result}
                    styles={styles}
                    theme={theme}
                  />
                ))}
              </Surface>
            )}
          </View>

          {palmares.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                router.push('/add-result');
              }}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <View style={styles.addButtonIcon}><Ionicons name="add" size={19} color={theme.onAccent} /></View>
              <View style={styles.addButtonCopy}>
                <Text style={styles.addButtonTitle}>AJOUTER UN RÉSULTAT</Text>
                <Text style={styles.addButtonSubtitle}>Compléter mon parcours sportif</Text>
              </View>
              <Ionicons name="arrow-forward" size={19} color={theme.onAccent} />
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function ResultRow({ result, index, styles, theme }: {
  result: PalmaresEntry;
  index: number;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
}) {
  const medalColor = MEDAL_COLORS[result.place];
  const statusTone = result.validationStatus === 'approved'
    ? 'success'
    : result.validationStatus === 'pending'
      ? 'warning'
      : 'accent';

  return (
    <View style={[styles.resultRow, index > 0 && styles.resultDivider]}>
      <View style={[styles.resultMedal, { backgroundColor: medalColor ?? theme.elevated }]}>
        <Text style={[styles.resultMedalText, !medalColor && styles.resultMedalTextMuted]}>{placeLabel(result.place)}</Text>
      </View>
      <View style={styles.resultCopy}>
        <Text style={styles.resultName} numberOfLines={1}>{result.competitionName}</Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {result.compDate}{result.weightClass ? ` · ${result.weightClass}` : ''}
        </Text>
        <View style={styles.resultTags}>
          {result.compType ? <Chip label={result.compType} tone="muted" /> : null}
          <Chip label={STATUS_LABELS[result.validationStatus]} tone={statusTone} />
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.ink },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loaderIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: `${theme.crimson}14` },
    loaderText: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
    scroll: { paddingHorizontal: Layout.gutter, paddingTop: 8, paddingBottom: 48, gap: 26 },
    pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
    hero: { minHeight: 244, overflow: 'hidden', padding: 20, borderRadius: Radii.lg, backgroundColor: theme.crimsonDeep, justifyContent: 'space-between' },
    heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -72, top: -86, backgroundColor: 'rgba(255,255,255,0.08)' },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    heroIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
    heroEyebrow: { color: theme.onAccentMuted, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    heroValue: { color: theme.onAccent, fontFamily: FONTS.display, fontSize: 58, lineHeight: 60, fontWeight: '900', letterSpacing: -2 },
    heroLabel: { color: theme.onAccentMuted, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginTop: 2 },
    heroFooter: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroMetric: { color: theme.onAccent, fontFamily: FONTS.display, fontSize: 18, fontWeight: '900' },
    heroMetricLabel: { color: theme.onAccentMuted, fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 0.8, marginTop: 2 },
    heroDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.18)' },
    pendingPill: { marginLeft: 'auto', minHeight: 28, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)' },
    pendingPillText: { color: theme.onAccent, fontFamily: FONTS.mono, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
    sectionBlock: { gap: 12 },
    medalGrid: { flexDirection: 'row', gap: 9 },
    medalCard: { flex: 1, minHeight: 122, padding: 12, alignItems: 'center', justifyContent: 'center' },
    medalDisc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.36)' },
    medalDiscText: { color: '#1A1210', fontFamily: FONTS.display, fontSize: 10, fontWeight: '900' },
    medalValue: { color: theme.bone, fontFamily: FONTS.display, fontSize: 23, fontWeight: '900', marginTop: 7 },
    medalLabel: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 2 },
    historyCard: { overflow: 'hidden' },
    resultRow: { minHeight: 104, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    resultDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.hairline },
    resultMedal: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.34)' },
    resultMedalText: { color: '#1A1210', fontFamily: FONTS.display, fontSize: 11, fontWeight: '900' },
    resultMedalTextMuted: { color: theme.textDim },
    resultCopy: { flex: 1, minWidth: 0 },
    resultName: { color: theme.bone, fontFamily: FONTS.body, fontSize: 14, fontWeight: '800' },
    resultMeta: { color: theme.textDim, fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 0.5, marginTop: 4 },
    resultTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
    addButton: { minHeight: 78, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radii.md, backgroundColor: theme.crimson },
    addButtonIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
    addButtonCopy: { flex: 1 },
    addButtonTitle: { color: theme.onAccent, fontFamily: FONTS.display, fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
    addButtonSubtitle: { color: theme.onAccentMuted, fontFamily: FONTS.body, fontSize: 11.5, marginTop: 3 },
  });
}
