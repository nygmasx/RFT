import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useCompetitions } from '@/hooks/useCompetitions';
import { Competition, Registration } from '@/lib/database.types';

function Tag({ text, color, filled, t }: { text: string; color?: string; filled?: boolean; t: Theme }) {
  const c = color ?? t.crimson;
  return (
    <View style={[tagSt(t).wrap, { borderColor: c, backgroundColor: filled ? c : 'transparent' }]}>
      <Text style={[tagSt(t).text, { color: filled ? t.ink : c }]}>{text}</Text>
    </View>
  );
}

function tagSt(t: Theme) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderRadius: 2 },
    text: { fontFamily: FONTS.mono, fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  });
}

function StatCell({ label, value, accent, last, t }: {
  label: string; value: string | number; accent?: boolean; last?: boolean; t: Theme;
}) {
  const s = statSt(t);
  return (
    <View style={[s.cell, last && s.cellLast]}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, accent && { color: t.crimson }]}>{String(value)}</Text>
    </View>
  );
}

function statSt(t: Theme) {
  return StyleSheet.create({
    cell: { flex: 1, padding: 9, borderRightWidth: 1, borderRightColor: t.hairline },
    cellLast: { borderRightWidth: 0 },
    label: { fontFamily: FONTS.mono, fontSize: 8.5, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase' },
    value: { fontFamily: FONTS.body, fontSize: 12, color: t.bone, fontWeight: '700', marginTop: 3 },
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase(),
    year: String(d.getFullYear()),
  };
}

function medalColor(place: number, t: Theme): string {
  if (place === 1) return '#C9A24B';
  if (place === 2) return '#9CA3AF';
  if (place === 3) return '#C87941';
  return t.textMute;
}

function medalLabel(place: number): string {
  if (place === 1) return 'OR';
  if (place === 2) return 'ARG';
  if (place === 3) return 'BRONZE';
  return 'TOP 4';
}

export default function CompetitionsScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['À venir', 'Mes inscriptions', 'Passées'];

  const { upcoming, registrations, loading } = useCompetitions();
  const today = new Date().toISOString().split('T')[0];

  // Past competitions = registrations whose comp date < today
  const pastRegistrations = registrations.filter(
    (r) => r.competitions && r.competitions.comp_date < (today ?? '')
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.season}>SAISON 25-26</Text>
            <Text style={styles.title}>COMPÉTITIONS</Text>
          </View>
          <Pressable style={styles.calBtn} onPress={() => router.push('/calendar')}>
            <Text style={styles.calIcon}>📅</Text>
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab, i) => (
            <Pressable key={i} style={[styles.tabItem, activeTab === i && styles.tabItemActive]} onPress={() => setActiveTab(i)}>
              <Text style={[styles.tabLabel, activeTab === i && styles.tabLabelActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {activeTab === 0 && (
            <>
              {upcoming.map((c: Competition) => {
                const { day, month, year } = formatDate(c.comp_date);
                return (
                  <Pressable
                    key={c.id}
                    style={styles.card}
                    onPress={() => router.push({ pathname: '/competition-detail', params: { id: c.id } })}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.dateBlock}>
                        <Text style={styles.dateMonth}>{month}</Text>
                        <Text style={styles.dateDay}>{day}</Text>
                        <Text style={styles.dateYear}>{year.slice(2)}</Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={styles.cardTags}>
                          {c.comp_type && <Tag text={c.comp_type} t={t} />}
                          {c.status === 'soon' && <Tag text="BIENTÔT" color={t.textDim} t={t} />}
                        </View>
                        <Text style={styles.cardName}>{c.name.toUpperCase()}</Text>
                        {c.location && <Text style={styles.cardLoc}>📍 {c.location}</Text>}
                      </View>
                    </View>
                    <View style={styles.statsRow}>
                      <StatCell label="CLÔTURE" value={c.registration_deadline ?? '—'} t={t} />
                      <StatCell label="STATUT" value={c.status.toUpperCase()} accent last t={t} />
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}

          {activeTab === 1 && (
            <>
              {registrations
                .filter((r) => !r.competitions || r.competitions.comp_date >= (today ?? ''))
                .map((r: Registration, i: number) => {
                  const comp = r.competitions;
                  if (!comp) return null;
                  const { day, month, year } = formatDate(comp.comp_date);
                  return (
                    <View key={i} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View style={styles.dateBlock}>
                          <Text style={styles.dateMonth}>{month}</Text>
                          <Text style={styles.dateDay}>{day}</Text>
                          <Text style={styles.dateYear}>{year.slice(2)}</Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <View style={styles.cardTags}>
                            {comp.comp_type && <Tag text={comp.comp_type} t={t} />}
                            <View style={[
                              styles.statusBadge,
                              { backgroundColor: r.status === 'confirmé' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)' },
                            ]}>
                              <Text style={[
                                styles.statusText,
                                { color: r.status === 'confirmé' ? '#22C55E' : '#F97316' },
                              ]}>
                                {r.status === 'confirmé' ? '✓ CONFIRMÉ' : '⏳ EN ATTENTE'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.cardName}>{comp.name.toUpperCase()}</Text>
                          {comp.location && <Text style={styles.cardLoc}>📍 {comp.location}</Text>}
                          {r.weight_class && <Text style={styles.cardCat}>{r.weight_class}</Text>}
                        </View>
                      </View>

                      <View style={styles.covRow}>
                        <Text style={styles.covLabel}>🚗 COVOIT</Text>
                        <Text style={styles.covNone}>Aucun covoiturage</Text>
                        <Pressable onPress={() => router.push('/covoiturage' as never)}>
                          <Text style={styles.covFind}>TROUVER →</Text>
                        </Pressable>
                      </View>

                      <View style={styles.cardActions}>
                        <Pressable style={styles.unregBtn}>
                          <Text style={styles.unregText}>SE DÉSINSCRIRE</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
            </>
          )}

          {activeTab === 2 && (
            <>
              {pastRegistrations.map((r: Registration, i: number) => {
                const comp = r.competitions;
                if (!comp) return null;
                const { day, month, year } = formatDate(comp.comp_date);
                return (
                  <View key={i} style={styles.pastCard}>
                    <View style={styles.pastLeft}>
                      <View style={[styles.medalDisc, { borderColor: t.textMute }]}>
                        <Text style={[styles.medalText, { color: t.textMute }]}>?</Text>
                      </View>
                    </View>
                    <View style={styles.pastInfo}>
                      <View style={styles.pastTags}>
                        {comp.comp_type && <Tag text={comp.comp_type} color={t.textDim} t={t} />}
                        {r.weight_class && <Tag text={r.weight_class} color={t.textDim} t={t} />}
                      </View>
                      <Text style={styles.pastName}>{comp.name}</Text>
                      {r.weight_class && <Text style={styles.pastCat}>{r.weight_class}</Text>}
                    </View>
                    <View style={styles.pastDate}>
                      <Text style={styles.pastDay}>{day}</Text>
                      <Text style={styles.pastMonth}>{month}</Text>
                      <Text style={styles.pastYear}>{year.slice(2)}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

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
    season: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    title: {
      fontFamily: FONTS.display, fontSize: 44, color: t.bone, fontWeight: '900',
      marginTop: 2, letterSpacing: 1,
    },
    calBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: t.elevated,
      borderWidth: 1, borderColor: t.hairline, alignItems: 'center', justifyContent: 'center',
    },
    calIcon: { fontSize: 16 },
    tabRow: {
      flexDirection: 'row', gap: 22, paddingHorizontal: 24, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    tabItem: { paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
    tabItemActive: { borderBottomColor: t.crimson },
    tabLabel: { fontFamily: FONTS.body, fontSize: 12.5, fontWeight: '700', color: t.textMute },
    tabLabelActive: { color: t.bone },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 20, gap: 12 },
    card: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, overflow: 'hidden',
    },
    cardTop: { padding: 14, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    dateBlock: {
      width: 60, paddingVertical: 8, alignItems: 'center',
      backgroundColor: t.ink, borderWidth: 1, borderColor: t.hairline, borderRadius: 2,
    },
    dateMonth: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5 },
    dateDay: {
      fontFamily: FONTS.display, fontSize: 30, color: t.crimson, fontWeight: '900',
      lineHeight: 32, marginVertical: 2,
    },
    dateYear: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5 },
    cardInfo: { flex: 1, minWidth: 0 },
    cardTags: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
    cardName: {
      fontFamily: FONTS.display, fontSize: 18, color: t.bone, fontWeight: '900',
      lineHeight: 20, letterSpacing: 0.5, marginBottom: 4,
    },
    cardLoc: { fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim },
    cardCat: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1, marginTop: 4 },
    statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.hairline },
    statusBadge: {
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2,
    },
    statusText: { fontFamily: FONTS.mono, fontSize: 9, fontWeight: '600', letterSpacing: 1 },
    covRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 14, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: t.hairline,
    },
    covLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1 },
    covValue: { fontFamily: FONTS.body, fontSize: 12, color: t.bone, fontWeight: '600', flex: 1 },
    covNone: { fontFamily: FONTS.body, fontSize: 12, color: t.textMute, flex: 1 },
    covFind: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.crimson, letterSpacing: 1 },
    cardActions: {
      paddingHorizontal: 14, paddingVertical: 12,
      borderTopWidth: 1, borderTopColor: t.hairline,
    },
    unregBtn: {
      height: 36, borderRadius: 2, borderWidth: 1, borderColor: t.hairlineStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    unregText: {
      fontFamily: FONTS.display, fontSize: 11, fontWeight: '900',
      color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase',
    },
    pastCard: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    pastLeft: { alignItems: 'center', width: 44 },
    medalDisc: {
      width: 40, height: 40, borderRadius: 20,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    medalText: {
      fontFamily: FONTS.display, fontSize: 18, fontWeight: '900',
    },
    pastInfo: { flex: 1, minWidth: 0 },
    pastTags: { flexDirection: 'row', gap: 6, marginBottom: 5 },
    pastName: {
      fontFamily: FONTS.body, fontSize: 13.5, color: t.bone, fontWeight: '700', marginBottom: 2,
    },
    pastCat: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1 },
    pastDate: { alignItems: 'center', minWidth: 36 },
    pastDay: {
      fontFamily: FONTS.display, fontSize: 22, color: t.bone, fontWeight: '900', lineHeight: 24,
    },
    pastMonth: { fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1.2 },
    pastYear: { fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1.2 },
  });
}
