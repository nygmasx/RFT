import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';

const MEDALS: Record<number, { color: string; label: string; name: string }> = {
  1: { color: '#D4A436', label: '1ER', name: 'OR' },
  2: { color: '#BFC4C7', label: '2E',  name: 'ARG' },
  3: { color: '#C07A3A', label: '3E',  name: 'BR' },
};

function MedalDisc({ place, size = 36, t }: { place: number; size?: number; t: Theme }) {
  const m = MEDALS[place];
  if (!m) {
    return (
      <View style={[discSt(t).base, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.elevated }]}>
        <Text style={discSt(t).topLabel}>T{place}</Text>
      </View>
    );
  }
  return (
    <View style={[discSt(t).base, { width: size, height: size, borderRadius: size / 2, backgroundColor: m.color }]}>
      <Text style={[discSt(t).label, { fontSize: size > 36 ? 13 : 11 }]}>{m.label}</Text>
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

function Tag({ text, t }: { text: string; t: Theme }) {
  return (
    <View style={tagSt(t).wrap}>
      <Text style={tagSt(t).text}>{text}</Text>
    </View>
  );
}

function tagSt(t: Theme) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: t.crimson, borderRadius: 2 },
    text: { fontFamily: FONTS.mono, fontSize: 9, color: t.crimson, fontWeight: '600', letterSpacing: 1 },
  });
}

const YEAR_FILTERS = ['Toutes', '2026', '2025', '2024'];

export default function PalmaresScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [activeYear, setActiveYear] = useState('Toutes');

  const { profile, palmares, loading } = useProfile();

  const filteredResults = activeYear === 'Toutes'
    ? palmares
    : palmares.filter((r) => r.compDate.startsWith(activeYear));

  const allYears = Array.from(new Set(palmares.map((r) => r.compDate.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  const yearsToShow = activeYear === 'Toutes' ? allYears : [activeYear];

  const gold   = palmares.filter((r) => r.place === 1).length;
  const silver = palmares.filter((r) => r.place === 2).length;
  const bronze = palmares.filter((r) => r.place === 3).length;
  const top4   = palmares.filter((r) => r.place >= 4).length;

  const SUMMARY = [
    { place: 1, count: gold, custom: undefined as string | undefined },
    { place: 2, count: silver, custom: undefined as string | undefined },
    { place: 3, count: bronze, custom: undefined as string | undefined },
    { place: 4, count: top4, custom: 'TOP 4' as string | undefined },
  ];

  const authorName = profile
    ? `${profile.firstName?.toUpperCase() ?? ''} ${profile.lastName?.toUpperCase() ?? ''}`.trim() || '—'
    : '—';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtitle}>{authorName}</Text>
            <Text style={styles.title}>PALMARÈS</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => router.push('/add-result')}>
            <Text style={styles.addText}>＋ AJOUTER</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Season header */}
          <Text style={styles.season}>SAISON · {palmares.length} COMPÉTITIONS</Text>

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
                    <MedalDisc place={r.place} size={36} t={t} />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{r.competitionName}</Text>
                      <Text style={styles.resultMeta}>{r.compDate} · {r.weightClass ?? ''}</Text>
                    </View>
                    {r.compType && <Tag text={r.compType} t={t} />}
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
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18,
      paddingBottom: 14, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    subtitle: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2 },
    title: {
      fontFamily: FONTS.display, fontSize: 22, color: t.bone, fontWeight: '900',
      letterSpacing: 0.5, marginTop: 1,
    },
    addBtn: {
      backgroundColor: t.crimson, paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 2,
    },
    addText: {
      fontFamily: FONTS.display, fontSize: 11, fontWeight: '900',
      color: t.bone, letterSpacing: 1.5,
    },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingTop: 16 },
    season: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2, marginBottom: 10 },
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    summaryCard: {
      flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 6,
    },
    summaryCount: { fontFamily: FONTS.display, fontSize: 24, color: t.bone, fontWeight: '900', lineHeight: 26 },
    summaryName: { fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1.5 },
    filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    filterChip: {
      flex: 1, paddingVertical: 7, borderRadius: 2, borderWidth: 1, borderColor: t.hairline,
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
    resultName: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700' },
    resultMeta: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1, marginTop: 2 },
    chevron: { fontSize: 18, color: t.textMute, lineHeight: 20 },
  });
}
