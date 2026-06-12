import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

function Tag({ text, filled, color, t }: { text: string; filled?: boolean; color?: string; t: Theme }) {
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

const ATTENDEES = ['DM', 'KB', 'YL', 'SP', 'TR', 'JV'];

const CARPOOLS = [
  { route: 'Creil → Paris',       dep: '07:15', driver: 'Karim B.',       filled: 2, total: 3, price: '6€',     full: false },
  { route: 'Compiègne → Paris',   dep: '06:50', driver: 'Yannick (Coach)', filled: 4, total: 4, price: 'OFFERT', full: true  },
];

export default function CompetitionDetailScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroBg} />
        <View style={styles.heroOverlay} />
        <SafeAreaView edges={['top']} style={styles.heroNav}>
          <Pressable onPress={() => router.back()} style={styles.heroBackBtn}>
            <Text style={styles.heroBackIcon}>‹</Text>
          </Pressable>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroActionBtn}>
              <Text style={styles.heroActionIcon}>📍</Text>
            </Pressable>
            <Pressable style={styles.heroActionBtn}>
              <Text style={styles.heroActionIcon}>🔖</Text>
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.heroContent}>
          <View style={styles.heroTags}>
            <Tag text="OUVERT" filled t={t} />
            <Tag text="GI · IBJJF" color={t.bone} t={t} />
          </View>
          <Text style={styles.heroTitle}>{'OPEN BJJ\nDE PARIS 2026'}</Text>
        </View>
      </View>

      {/* Quick facts */}
      <View style={styles.facts}>
        {[
          ['DIM 01 JUIN', '07:30'],
          ['HALLE CARPENTIER', 'PARIS'],
          ['PESÉE', '08:00'],
        ].map(([a, b], i) => (
          <View key={i} style={[styles.factCell, i < 2 && styles.factBorder]}>
            <Text style={styles.factLabel}>{a}</Text>
            <Text style={styles.factValue}>{b}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Brief */}
        <Text style={styles.sectionLabel}>BRIEF</Text>
        <Text style={styles.brief}>
          Rendez-vous au club à{' '}
          <Text style={{ color: t.crimson, fontWeight: '700' }}>06:45</Text>
          {' '}pour les départs en covoiturage. Pesée individuelle, kimono blanc ou bleu réglementaire. Coach Yannick coache.
        </Text>

        {/* Inscrits */}
        <View style={styles.inscCard}>
          <View style={styles.inscHeader}>
            <Text style={styles.sectionLabel}>INSCRITS DU CLUB</Text>
            <Text style={styles.inscCount}>14</Text>
          </View>
          <View style={styles.avatarRow}>
            {ATTENDEES.map((n, i) => (
              <View key={i} style={[styles.attendeeAvatar, i > 0 && styles.attendeeOverlap]}>
                <Text style={styles.attendeeInitials}>{n}</Text>
              </View>
            ))}
            <View style={[styles.attendeeAvatar, styles.attendeeOverlap, styles.attendeeMore]}>
              <Text style={styles.attendeeMoreText}>+8</Text>
            </View>
            <Text style={styles.attendeeNames}>Driss, Karim, Yannis…</Text>
          </View>
        </View>

        {/* Covoiturages */}
        <View style={styles.covHeader}>
          <Text style={styles.sectionLabel}>COVOITURAGES — 3</Text>
          <Text style={styles.covPropose}>+ PROPOSER</Text>
        </View>

        {CARPOOLS.map((r, i) => (
          <View key={i} style={[styles.covCard, r.full && { opacity: 0.6 }]}>
            <View style={styles.covCardIcon}>
              <Text style={{ fontSize: 18 }}>🚗</Text>
            </View>
            <View style={styles.covInfo}>
              <Text style={styles.covRoute}>{r.route}</Text>
              <Text style={styles.covMeta}>Départ {r.dep} · {r.driver}</Text>
            </View>
            <View style={styles.covSeats}>
              <Text style={styles.covSeatCount}>{r.filled}/{r.total}</Text>
              <Text style={[styles.covSeatLabel, r.full && { color: t.textMute }]}>
                {r.full ? 'COMPLET' : r.price}
              </Text>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} style={styles.cta}>
        <Pressable style={styles.ctaPrimary}>
          <Text style={styles.ctaPrimaryText}>JE M'INSCRIS</Text>
        </Pressable>
        <Pressable style={styles.ctaSecondary}>
          <Text style={styles.ctaSecondaryText}>PARTAGER</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    hero: { height: 220, position: 'relative', marginBottom: 4 },
    heroBg: { ...StyleSheet.absoluteFill, backgroundColor: '#2a1a16' },
    heroOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(10,10,10,0.75)',
    },
    heroNav: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 18, paddingTop: 4,
    },
    heroBackBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },
    heroBackIcon: { fontSize: 24, color: t.bone, lineHeight: 26 },
    heroActions: { flexDirection: 'row', gap: 8 },
    heroActionBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },
    heroActionIcon: { fontSize: 14 },
    heroContent: { position: 'absolute', bottom: 14, left: 18, right: 18 },
    heroTags: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    heroTitle: {
      fontFamily: FONTS.display, fontSize: 32, color: t.bone, fontWeight: '900',
      lineHeight: 32, letterSpacing: 0.5,
    },
    facts: {
      flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.hairline,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    factCell: { flex: 1, padding: 10 },
    factBorder: { borderRightWidth: 1, borderRightColor: t.hairline },
    factLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginBottom: 3 },
    factValue: {
      fontFamily: FONTS.display, fontSize: 15, color: t.bone, fontWeight: '900', letterSpacing: 0.5,
    },
    scroll: { paddingHorizontal: 20, paddingTop: 16 },
    sectionLabel: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2, marginBottom: 8 },
    brief: { fontFamily: FONTS.body, fontSize: 13, color: t.text, lineHeight: 20, marginBottom: 18 },
    inscCard: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, padding: 12, marginBottom: 22,
    },
    inscHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    inscCount: {
      fontFamily: FONTS.display, fontSize: 18, color: t.crimson, fontWeight: '900',
    },
    avatarRow: { flexDirection: 'row', alignItems: 'center' },
    attendeeAvatar: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: t.elevated,
      borderWidth: 2, borderColor: t.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    attendeeOverlap: { marginLeft: -8 },
    attendeeInitials: { fontFamily: FONTS.display, fontSize: 9, color: t.bone, fontWeight: '900' },
    attendeeMore: { backgroundColor: t.crimson },
    attendeeMoreText: { fontFamily: FONTS.body, fontSize: 9.5, color: t.bone, fontWeight: '700' },
    attendeeNames: { fontFamily: FONTS.body, fontSize: 11, color: t.textDim, marginLeft: 'auto' },
    covHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    covPropose: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, letterSpacing: 1.5 },
    covCard: {
      flexDirection: 'row', gap: 12, alignItems: 'center',
      padding: 12, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3, marginBottom: 8,
    },
    covCardIcon: {
      width: 38, height: 38, backgroundColor: t.elevated, borderRadius: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    covInfo: { flex: 1 },
    covRoute: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700' },
    covMeta: { fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim, marginTop: 2 },
    covSeats: { alignItems: 'flex-end' },
    covSeatCount: {
      fontFamily: FONTS.display, fontSize: 14, color: t.bone, fontWeight: '900',
    },
    covSeatLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.crimson, letterSpacing: 1.5 },
    cta: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
      backgroundColor: t.ink,
    },
    ctaPrimary: {
      flex: 1, height: 50, backgroundColor: t.crimson, borderRadius: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaPrimaryText: {
      fontFamily: FONTS.display, fontSize: 16, fontWeight: '900',
      color: t.bone, letterSpacing: 2, textTransform: 'uppercase',
    },
    ctaSecondary: {
      height: 50, paddingHorizontal: 16, borderRadius: 2,
      borderWidth: 1, borderColor: t.hairlineStrong, alignItems: 'center', justifyContent: 'center',
    },
    ctaSecondaryText: {
      fontFamily: FONTS.display, fontSize: 14, fontWeight: '900',
      color: t.bone, letterSpacing: 1.5, textTransform: 'uppercase',
    },
  });
}
