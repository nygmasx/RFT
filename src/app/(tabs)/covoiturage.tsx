import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useCarpools } from '@/hooks/useCarpools';

const FILTERS = ['Tous'];

function Tag({ text, t }: { text: string; t: Theme }) {
  return (
    <View style={[tagSt(t).wrap]}>
      <Text style={tagSt(t).text}>{text.toUpperCase()}</Text>
    </View>
  );
}

function tagSt(t: Theme) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: t.crimson, borderRadius: 2 },
    text: { fontFamily: FONTS.mono, fontSize: 8.5, color: t.crimson, fontWeight: '600', letterSpacing: 1 },
  });
}

function initials(name: string) {
  return name.split(' ').map((s) => s[0]).join('');
}

function formatDeparture(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleString('fr-FR', { weekday: 'short' }).toUpperCase();
  const date = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${date}/${month} · ${hours}:${mins}`;
}

export default function CovoiturageScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { data: carpools, loading } = useCarpools();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>{String(carpools.length).padStart(2, '0')} TRAJETS</Text>
          <Text style={styles.title}>COVOITURAGE</Text>
        </View>

        {/* Mode switcher */}
        <View style={styles.modeSwitcher}>
          <View style={[styles.modeBtn, styles.modeBtnActive]}>
            <Text style={styles.modeBtnActiveText}>JE CHERCHE</Text>
          </View>
          <Pressable style={[styles.modeBtn, styles.modeBtnInactive]} onPress={() => router.push('/create-carpool')}>
            <Text style={styles.modeBtnInactiveText}>JE PROPOSE</Text>
          </Pressable>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f, i) => (
            <Pressable key={i} style={[styles.filterChip, i === 0 && styles.filterChipActive]}>
              <Text style={[styles.filterText, i === 0 && styles.filterTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Mini map placeholder */}
      <View style={styles.mapWrap}>
        <View style={styles.mapBg} />
        <View style={styles.mapDojo}>
          <View style={styles.mapDojoDot} />
          <Text style={styles.mapLabel}>DOJO</Text>
        </View>
        <View style={styles.mapDest}>
          <View style={styles.mapDestPin} />
          <Text style={styles.mapLabel}>DEST.</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {carpools.map((r, i) => {
            const driverName = r.profiles
              ? `${r.profiles.first_name} ${r.profiles.last_name}`
              : 'Conducteur';
            const eventName = r.competitions?.name ?? 'Événement';
            const available = r.seats_total - r.seats_taken;
            const isFull = available <= 0;

            return (
              <View key={i} style={styles.card}>
                <View style={styles.driverRow}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitials}>{initials(driverName)}</Text>
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    <Text style={styles.driverTime}>{formatDeparture(r.departure_at)}</Text>
                  </View>
                  <Tag text={eventName} t={t} />
                </View>

                <View style={styles.routeRow}>
                  <View style={styles.routeIcons}>
                    <View style={styles.routeCircle} />
                    <View style={styles.routeLine} />
                    <View style={styles.routeSquare} />
                  </View>
                  <View style={styles.routeLabels}>
                    <Text style={styles.routeCity}>{r.departure_city}</Text>
                    <Text style={styles.routeCity}>{r.competitions?.name ?? '—'}</Text>
                  </View>
                  <View style={styles.seats}>
                    <Text style={styles.seatCount}>
                      {available}
                      <Text style={styles.seatTotal}>/{r.seats_total}</Text>
                    </Text>
                    <Text style={styles.seatLabel}>PLACES</Text>
                  </View>
                </View>

                <Pressable style={[styles.reserveBtn, isFull && styles.reserveBtnFull]}>
                  <Text style={[styles.reserveText, isFull && styles.reserveTextFull]}>
                    {isFull ? 'COMPLET' : 'RÉSERVER UNE PLACE'}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: { paddingHorizontal: 24, paddingBottom: 14, paddingTop: 8 },
    subtitle: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    title: {
      fontFamily: FONTS.display, fontSize: 44, color: t.bone, fontWeight: '900',
      marginTop: 2, letterSpacing: 1,
    },
    modeSwitcher: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 14 },
    modeBtn: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
    modeBtnActive: { backgroundColor: t.crimson },
    modeBtnInactive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.hairlineStrong },
    modeBtnActiveText: {
      fontFamily: FONTS.display, fontSize: 12, fontWeight: '900',
      color: t.bone, letterSpacing: 1.5, textTransform: 'uppercase',
    },
    modeBtnInactiveText: {
      fontFamily: FONTS.display, fontSize: 12, fontWeight: '900',
      color: t.textDim, letterSpacing: 1.5, textTransform: 'uppercase',
    },
    filterRow: { paddingHorizontal: 20, paddingBottom: 14, gap: 6 },
    filterChip: {
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2,
      borderWidth: 1, borderColor: t.hairline,
    },
    filterChipActive: { backgroundColor: t.bone, borderColor: t.bone },
    filterText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, fontWeight: '600' },
    filterTextActive: { color: t.ink },
    mapWrap: {
      marginHorizontal: 20, marginBottom: 16, height: 140,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, overflow: 'hidden', position: 'relative',
    },
    mapBg: { ...StyleSheet.absoluteFill, backgroundColor: t.surface },
    mapDojo: { position: 'absolute', left: 60, top: 70, alignItems: 'center' },
    mapDojoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.crimson },
    mapDest: { position: 'absolute', right: 50, top: 50, alignItems: 'center' },
    mapDestPin: { width: 10, height: 14, backgroundColor: t.bone, borderRadius: 1 },
    mapLabel: { fontFamily: FONTS.mono, fontSize: 8, color: t.bone, letterSpacing: 2, marginTop: 4 },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, gap: 10 },
    card: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, padding: 14,
    },
    driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    driverAvatar: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: t.elevated,
      alignItems: 'center', justifyContent: 'center',
    },
    driverInitials: { fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900' },
    driverInfo: { flex: 1 },
    driverName: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700' },
    driverTime: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.2, marginTop: 1 },
    routeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
      borderTopWidth: 1, borderTopColor: t.hairline,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    routeIcons: { alignItems: 'center', gap: 2, paddingTop: 2 },
    routeCircle: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: t.bone },
    routeLine: { width: 1, height: 16, backgroundColor: t.hairlineStrong },
    routeSquare: { width: 8, height: 8, borderRadius: 1, backgroundColor: t.crimson },
    routeLabels: { flex: 1, gap: 4 },
    routeCity: { fontFamily: FONTS.body, fontSize: 12.5, color: t.bone, fontWeight: '600' },
    seats: { alignItems: 'flex-end' },
    seatCount: { fontFamily: FONTS.display, fontSize: 18, color: t.bone, fontWeight: '900' },
    seatTotal: { color: t.textMute, fontSize: 13 },
    seatLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.crimson, letterSpacing: 1.5 },
    reserveBtn: {
      marginTop: 10, height: 36, borderRadius: 2,
      borderWidth: 1, borderColor: t.crimson, alignItems: 'center', justifyContent: 'center',
    },
    reserveBtnFull: { borderColor: t.hairline },
    reserveText: {
      fontFamily: FONTS.display, fontSize: 12, fontWeight: '900',
      color: t.bone, letterSpacing: 1.5, textTransform: 'uppercase',
    },
    reserveTextFull: { color: t.textMute },
  });
}
