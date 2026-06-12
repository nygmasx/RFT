import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { MONTHLY_ATTENDANCE, MY_ACTIVITY } from '@/data/rft-data';

const BAR_MAX_H = 80;
const maxCount = Math.max(...MONTHLY_ATTENDANCE.map((m) => m.count));

export default function MonActiviteScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Summary stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCell, styles.statBorder]}>
            <Text style={styles.statValue}>62</Text>
            <Text style={styles.statLabel}>COURS</Text>
          </View>
          <View style={[styles.statCell, styles.statBorder]}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>STAGES</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>84%</Text>
            <Text style={styles.statLabel}>ASSIDUITÉ</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.card}>
          <Text style={styles.chartTitle}>PRÉSENCES — 6 DERNIERS MOIS</Text>
          <View style={styles.chartRow}>
            {MONTHLY_ATTENDANCE.map((item, i) => {
              const isLast = i === MONTHLY_ATTENDANCE.length - 1;
              const barH = Math.max(4, Math.round((item.count / maxCount) * BAR_MAX_H));
              return (
                <View key={i} style={styles.chartBar}>
                  <Text style={[styles.chartCount, { color: isLast ? t.crimson : t.textDim }]}>
                    {item.count}
                  </Text>
                  <View style={[styles.bar, {
                    height: barH,
                    backgroundColor: t.crimson,
                    opacity: isLast ? 1 : 0.35,
                  }]} />
                  <Text style={[styles.chartMonth, { color: isLast ? t.crimson : t.textMute }]}>
                    {item.month}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Activity list */}
        <Text style={styles.sectionLabel}>MES DERNIERS COURS</Text>
        <View style={styles.activityList}>
          {MY_ACTIVITY.map((a, i) => (
            <View key={i} style={[styles.activityRow, i > 0 && styles.activityBorder]}>
              <View style={styles.actLeft}>
                <View style={[styles.actDot, { backgroundColor: a.type === 'stage' ? t.gold : '#3B82F6' }]} />
                <View style={[
                  styles.actTag,
                  { backgroundColor: a.type === 'stage' ? 'rgba(201,162,75,0.12)' : 'rgba(59,130,246,0.12)' },
                ]}>
                  <Text style={[styles.actTagText, { color: a.type === 'stage' ? t.gold : '#3B82F6' }]}>
                    {a.type === 'stage' ? 'STAGE' : 'COURS'}
                  </Text>
                </View>
              </View>
              <View style={styles.actCenter}>
                <Text style={styles.actTitle}>{a.title}</Text>
                <Text style={styles.actDate}>{a.date}</Text>
              </View>
              <Text style={styles.actDuration}>{a.duration}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
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

    // Chart
    card: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, padding: 14,
    },
    chartTitle: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1.5, marginBottom: 14 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: BAR_MAX_H + 36 },
    chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    bar: { width: '70%', borderRadius: 2, minHeight: 4 },
    chartCount: { fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: 0.5 },
    chartMonth: { fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 1 },

    // Activity list
    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2, marginTop: 4,
    },
    activityList: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    activityBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    actLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actDot: { width: 7, height: 7, borderRadius: 3.5 },
    actTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
    actTagText: { fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5 },
    actCenter: { flex: 1 },
    actTitle: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '600' },
    actDate: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1, marginTop: 2 },
    actDuration: { fontFamily: FONTS.mono, fontSize: 10.5, color: t.textDim, letterSpacing: 0.5 },
  });
}
