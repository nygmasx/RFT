import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { DetailHeader, EmptyState, IconButton, SectionHeading } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useMyCarpool } from '@/hooks/useMyCarpool';
import { safeBack } from '@/lib/navigation';

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
  const { upcoming, completed } = carpools.reduce((groups, carpool) => {
    groups[carpool.departure_at >= now ? 'upcoming' : 'completed'].push(carpool);
    return groups;
  }, { upcoming: [] as typeof carpools, completed: [] as typeof carpools });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <DetailHeader
          eyebrow="Mobilité du club"
          title="MES COVOITURAGES"
          onBack={() => safeBack('/(tabs)/covoiturage')}
          action={<IconButton accent icon="add" label="Proposer un covoiturage" onPress={() => router.push('/create-carpool')} />}
        />
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
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statValue}>{String(upcoming.length).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>À VENIR</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{String(completed.length).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>TERMINÉS</Text>
            </View>
          </View>

          {carpools.length === 0 ? (
            <EmptyState
              icon="car-sport-outline"
              title="Aucun trajet réservé"
              message="Tes propositions et réservations apparaîtront ici."
              actionLabel="VOIR LES TRAJETS"
              onAction={() => router.replace('/(tabs)/covoiturage')}
            />
          ) : null}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <>
              <SectionHeading title="À VENIR" meta={`${upcoming.length} trajet${upcoming.length > 1 ? 's' : ''}`} />
              {upcoming.map((c) => (
                <View key={c.id} style={[styles.carpoolCard, styles.carpoolUpcoming]}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.roleBadge, { backgroundColor: c.role === 'driver' ? t.crimson : t.elevated, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons name={c.role === 'driver' ? 'car-outline' : 'person-outline'} size={12} color={c.role === 'driver' ? t.onAccent : t.bone} />
                      <Text style={[styles.roleBadgeText, c.role === 'driver' && { color: t.onAccent }]}>
                        {c.role === 'driver' ? 'CONDUCTEUR' : 'PASSAGER'}
                      </Text>
                    </View>
                    <View style={styles.upcomingPill}>
                      <Text style={styles.upcomingText}>À VENIR</Text>
                    </View>
                  </View>
                  <Text style={styles.carpoolEvent}>{c.event}</Text>
                  <Text style={styles.carpoolRoute}>{c.departure_city}</Text>
                  <View style={styles.carpoolMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={11} color={t.textMute} />
                      <Text style={styles.carpoolDate}>{formatDate(c.departure_at)}</Text>
                    </View>
                    {c.role === 'driver' && (
                      <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={11} color={t.textMute} />
                        <Text style={styles.carpoolPassengers}>{c.seats_taken} passagers</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <>
              <SectionHeading title="PASSÉS" meta={`${completed.length} trajet${completed.length > 1 ? 's' : ''}`} />
              {completed.map((c, i) => (
                <View key={c.id} style={[styles.carpoolCard, i > 0 && { marginTop: 8 }]}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.roleBadge, { backgroundColor: c.role === 'driver' ? t.elevated : 'rgba(59,130,246,0.15)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons name={c.role === 'driver' ? 'car-outline' : 'person-outline'} size={12} color={c.role === 'driver' ? t.textDim : '#3B82F6'} />
                      <Text style={[styles.roleBadgeText, { color: c.role === 'driver' ? t.textDim : '#3B82F6' }]}>
                        {c.role === 'driver' ? 'CONDUCTEUR' : 'PASSAGER'}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={18} color={t.crimson} />
                  </View>
                  <Text style={styles.carpoolEvent}>{c.event}</Text>
                  <Text style={styles.carpoolRoute}>{c.departure_city}</Text>
                  <View style={styles.carpoolMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={11} color={t.textMute} />
                      <Text style={styles.carpoolDate}>{formatDate(c.departure_at)}</Text>
                    </View>
                    {c.role === 'driver' && (
                      <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={11} color={t.textMute} />
                        <Text style={styles.carpoolPassengers}>{c.seats_taken} passagers</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Propose carpool */}
          <Pressable accessibilityRole="button" style={styles.proposeBtn} onPress={() => router.push('/create-carpool')}>
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
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: Layout.gutter, paddingTop: 8, gap: 18 },

    // Stats
    statsRow: {
      flexDirection: 'row', backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, overflow: 'hidden',
    },
    statCell: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    statBorder: { borderRightWidth: 1, borderRightColor: t.hairline },
    statValue: { fontFamily: FONTS.display, fontSize: 28, color: t.crimson, fontWeight: '900', lineHeight: 30 },
    statLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginTop: 4 },

    // Carpool cards
    carpoolCard: {
      padding: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg,
    },
    carpoolUpcoming: {
      borderLeftWidth: 3, borderLeftColor: t.crimson,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    roleBadge: {
      paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radii.round,
    },
    roleBadgeText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.bone, letterSpacing: 1, fontWeight: '700' },
    upcomingPill: { backgroundColor: t.crimson, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radii.round },
    upcomingText: { fontFamily: FONTS.mono, fontSize: 8, color: t.onAccent, letterSpacing: 1.5, fontWeight: '700' },
    carpoolEvent: { fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '700' },
    carpoolRoute: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 1, marginTop: 3 },
    carpoolMeta: { flexDirection: 'row', gap: 14, marginTop: 6 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    carpoolDate: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 0.5 },
    carpoolPassengers: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 0.5 },

    // Propose button
    proposeBtn: {
      marginTop: 4, minHeight: 50, backgroundColor: t.crimson,
      borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center',
    },
    proposeBtnText: {
      fontFamily: FONTS.display, fontSize: 13, color: t.onAccent, fontWeight: '900', letterSpacing: 1.5,
    },
  });
}
