import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useMyCarpool } from '@/hooks/useMyCarpool';

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function MesCovoituragesScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { data: carpools, loading } = useMyCarpool();

  const now = new Date().toISOString();
  const upcoming = carpools.filter((c) => c.departure_at >= now);
  const completed = carpools.filter((c) => c.departure_at < now);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>MES COVOITURAGES</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statValue}>{String(carpools.length).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>TRAJETS</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>KM PARTAGÉS</Text>
            </View>
          </View>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>À VENIR</Text>
              {upcoming.map((c) => (
                <View key={c.id} style={[styles.carpoolCard, styles.carpoolUpcoming]}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.roleBadge, { backgroundColor: c.role === 'driver' ? t.crimson : t.elevated }]}>
                      <Text style={styles.roleBadgeText}>
                        {c.role === 'driver' ? '🚗 CONDUCTEUR' : '🎒 PASSAGER'}
                      </Text>
                    </View>
                    <View style={styles.upcomingPill}>
                      <Text style={styles.upcomingText}>À VENIR</Text>
                    </View>
                  </View>
                  <Text style={styles.carpoolEvent}>{c.event}</Text>
                  <Text style={styles.carpoolRoute}>{c.departure_city}</Text>
                  <View style={styles.carpoolMeta}>
                    <Text style={styles.carpoolDate}>📅 {formatDate(c.departure_at)}</Text>
                    {c.role === 'driver' && (
                      <Text style={styles.carpoolPassengers}>👥 {c.seats_taken} passagers</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>PASSÉS</Text>
              {completed.map((c, i) => (
                <View key={c.id} style={[styles.carpoolCard, i > 0 && { marginTop: 8 }]}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.roleBadge, { backgroundColor: c.role === 'driver' ? t.elevated : 'rgba(59,130,246,0.15)' }]}>
                      <Text style={[styles.roleBadgeText, { color: c.role === 'driver' ? t.textDim : '#3B82F6' }]}>
                        {c.role === 'driver' ? '🚗 CONDUCTEUR' : '🎒 PASSAGER'}
                      </Text>
                    </View>
                    <Text style={styles.checkmark}>✅</Text>
                  </View>
                  <Text style={styles.carpoolEvent}>{c.event}</Text>
                  <Text style={styles.carpoolRoute}>{c.departure_city}</Text>
                  <View style={styles.carpoolMeta}>
                    <Text style={styles.carpoolDate}>📅 {formatDate(c.departure_at)}</Text>
                    {c.role === 'driver' && (
                      <Text style={styles.carpoolPassengers}>👥 {c.seats_taken} passagers</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Propose carpool */}
          <Pressable style={styles.proposeBtn} onPress={() => router.push('/create-carpool')}>
            <Text style={styles.proposeBtnText}>＋ PROPOSER UN COVOIT</Text>
          </Pressable>

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
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    title: {
      flex: 1, fontFamily: FONTS.display, fontSize: 18, color: t.bone,
      fontWeight: '900', letterSpacing: 0.5,
    },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },

    // Stats
    statsRow: {
      flexDirection: 'row', borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    statCell: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    statBorder: { borderRightWidth: 1, borderRightColor: t.hairline },
    statValue: { fontFamily: FONTS.display, fontSize: 28, color: t.crimson, fontWeight: '900', lineHeight: 30 },
    statLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginTop: 4 },

    // Section label
    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2, marginTop: 4,
    },

    // Carpool cards
    carpoolCard: {
      padding: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    carpoolUpcoming: {
      borderLeftWidth: 3, borderLeftColor: t.crimson,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    roleBadge: {
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2,
    },
    roleBadgeText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.bone, letterSpacing: 1, fontWeight: '700' },
    upcomingPill: { backgroundColor: t.crimson, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 },
    upcomingText: { fontFamily: FONTS.mono, fontSize: 8, color: t.bone, letterSpacing: 1.5, fontWeight: '700' },
    checkmark: { fontSize: 14 },
    carpoolEvent: { fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '700' },
    carpoolRoute: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 1, marginTop: 3 },
    carpoolMeta: { flexDirection: 'row', gap: 14, marginTop: 6 },
    carpoolDate: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 0.5 },
    carpoolPassengers: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 0.5 },

    // Propose button
    proposeBtn: {
      marginTop: 4, backgroundColor: t.crimson, paddingVertical: 15,
      borderRadius: 3, alignItems: 'center',
    },
    proposeBtnText: {
      fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900', letterSpacing: 1.5,
    },
  });
}
