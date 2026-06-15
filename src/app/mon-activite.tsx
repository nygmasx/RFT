import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';

const MEDAL_COLORS: Record<number, string> = {
  1: '#D4A436', 2: '#BFC4C7', 3: '#C07A3A',
};

function placeLabel(place: number): string {
  if (place === 1) return '1ER';
  if (place === 2) return '2E';
  if (place === 3) return '3E';
  return `T${place}`;
}

export default function MonActiviteScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { palmares, loading } = useProfile();

  const gold   = palmares.filter((r) => r.place === 1).length;
  const silver = palmares.filter((r) => r.place === 2).length;
  const bronze = palmares.filter((r) => r.place === 3).length;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>MON ACTIVITÉ</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.crimson} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Summary stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statValue}>{String(palmares.length).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>COMPÉT.</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={[styles.statValue, { color: MEDAL_COLORS[1] }]}>{gold}</Text>
              <Text style={styles.statLabel}>OR</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={[styles.statValue, { color: MEDAL_COLORS[2] }]}>{silver}</Text>
              <Text style={styles.statLabel}>ARGENT</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: MEDAL_COLORS[3] }]}>{bronze}</Text>
              <Text style={styles.statLabel}>BRONZE</Text>
            </View>
          </View>

          {/* Competition history */}
          <Text style={styles.sectionLabel}>HISTORIQUE DES COMPÉTITIONS</Text>

          {palmares.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="medal-outline" size={48} color={t.textMute} />
              <Text style={styles.emptyText}>Aucune compétition enregistrée</Text>
              <Pressable style={styles.addBtn} onPress={() => router.push('/add-result')}>
                <Text style={styles.addBtnText}>＋ AJOUTER UN RÉSULTAT</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {palmares.map((r, i) => {
                const medalColor = MEDAL_COLORS[r.place];
                return (
                  <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                    {/* Medal disc */}
                    <View style={[styles.medal, { backgroundColor: medalColor ?? t.elevated }]}>
                      <Text style={[styles.medalText, { color: medalColor ? '#1a0e0b' : t.textDim }]}>
                        {placeLabel(r.place)}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={styles.rowInfo}>
                      <Text style={styles.compName}>{r.competition_name}</Text>
                      <View style={styles.rowMeta}>
                        <Text style={styles.metaText}>{r.comp_date}</Text>
                        {r.weight_class && (
                          <Text style={styles.metaText}>· {r.weight_class}</Text>
                        )}
                      </View>
                    </View>

                    {/* Type tag */}
                    {r.comp_type && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{r.comp_type}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {palmares.length > 0 && (
            <Pressable style={styles.addBtn} onPress={() => router.push('/add-result')}>
              <Text style={styles.addBtnText}>＋ AJOUTER UN RÉSULTAT</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    title: {
      flex: 1, fontFamily: FONTS.display, fontSize: 20, color: t.bone,
      fontWeight: '900', letterSpacing: 0.5,
    },
    scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },

    // Stats
    statsRow: {
      flexDirection: 'row', borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    statCell: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    statBorder: { borderRightWidth: 1, borderRightColor: t.hairline },
    statValue: { fontFamily: FONTS.display, fontSize: 26, color: t.crimson, fontWeight: '900', lineHeight: 28 },
    statLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginTop: 4 },

    // List
    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2, marginTop: 4,
    },
    list: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    rowBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    medal: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.4)',
    },
    medalText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    rowInfo: { flex: 1 },
    compName: { fontFamily: FONTS.body, fontSize: 13.5, color: t.bone, fontWeight: '700' },
    rowMeta: { flexDirection: 'row', gap: 6, marginTop: 3 },
    metaText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 0.5 },
    tag: {
      paddingHorizontal: 6, paddingVertical: 3,
      borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 2,
    },
    tagText: { fontFamily: FONTS.mono, fontSize: 8.5, color: t.textDim, letterSpacing: 1 },

    // Empty + add
    empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyText: { fontFamily: FONTS.body, fontSize: 14, color: t.textMute },
    addBtn: {
      borderWidth: 1, borderColor: t.crimson, borderRadius: 3,
      paddingVertical: 12, alignItems: 'center',
    },
    addBtnText: { fontFamily: FONTS.mono, fontSize: 11, color: t.crimson, letterSpacing: 1.5, fontWeight: '700' },
  });
}
