import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';

// ─── Belt colors ─────────────────────────────────────────────────
const BELT_COLORS: Record<string, string> = {
  blanche:  '#EFE7D2',
  bleue:    '#1E4B86',
  violette: '#4D2D74',
  marron:   '#4A2E1C',
  noire:    '#0A0A0A',
};

const BELT_ORDER = ['blanche', 'bleue', 'violette', 'marron', 'noire'] as const;
const BELT_LABEL: Record<string, string> = {
  blanche: 'BL.', bleue: 'BL.', violette: 'VIO.', marron: 'MAR.', noire: 'NOI.',
};

function BJJBelt({ color = 'marron', height = 32 }: { color?: string; height?: number }) {
  const bg = BELT_COLORS[color] ?? BELT_COLORS.marron;
  return (
    <View style={[beltS.belt, { height, backgroundColor: bg }]}>
      <View style={beltS.stitch} />
    </View>
  );
}

const beltS = StyleSheet.create({
  belt: {
    borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row', overflow: 'hidden',
  },
  stitch: {
    position: 'absolute', left: 6, right: 90, top: '50%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});

// ─── Medal disc ───────────────────────────────────────────────────
const MEDALS: Record<number, { color: string; label: string; name: string }> = {
  1: { color: '#D4A436', label: '1ER', name: 'OR' },
  2: { color: '#BFC4C7', label: '2E',  name: 'ARG' },
  3: { color: '#C07A3A', label: '3E',  name: 'BR' },
};

function MedalDisc({ place, size = 32, t }: { place: number; size?: number; t: Theme }) {
  const m = MEDALS[place];
  if (!m) {
    return (
      <View style={[mdS(t).disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.elevated }]}>
        <Text style={mdS(t).topLabel}>T{place}</Text>
      </View>
    );
  }
  return (
    <View style={[mdS(t).disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: m.color }]}>
      <Text style={[mdS(t).label, { fontSize: size > 36 ? 13 : 11 }]}>{m.label}</Text>
    </View>
  );
}

function mdS(t: Theme) {
  return StyleSheet.create({
    disc: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.5)' },
    label: { color: '#1a0e0b', fontWeight: '900' },
    topLabel: { color: t.textDim, fontSize: 10, fontWeight: '700' },
  });
}

export default function ProfilScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);

  const { profile, belt, palmares, loading } = useProfile();
  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={t.crimson} />
      </View>
    );
  }

  const firstName = profile?.firstName ?? '';
  const lastName = profile?.lastName ?? '';
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`;
  const memberId = profile?.memberId ? `#${profile.memberId}` : '—';

  const beltColor = belt?.color ?? 'blanche';
  const beltStripes = belt?.stripes ?? 0;
  const beltColorLabel = beltColor.toUpperCase();
  const beltPromoBy = belt?.promotedBy ?? '—';
  const beltPromoDate = belt?.promotedDate ?? '—';

  const gold   = palmares.filter((r) => r.place === 1).length;
  const silver = palmares.filter((r) => r.place === 2).length;
  const bronze = palmares.filter((r) => r.place === 3).length;
  const top4   = palmares.filter((r) => r.place >= 4).length;
  const recentResults = palmares.slice(0, 2);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.memberId}>MEMBRE {memberId}</Text>
            <Text style={styles.title}>PROFIL</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {isCoach && (
              <Pressable style={styles.settingsBtn} onPress={() => router.push('/admin')}>
                <Ionicons name="shield-outline" size={22} color={t.bone} />
              </Pressable>
            )}
            <Pressable style={styles.settingsBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={22} color={t.bone} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Identity card ────────────────────────────────── */}
        <View style={styles.idCard}>
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.idGlow} />
          </View>
          <View style={styles.idRow}>
            <View style={styles.avatar}>
              {profile?.avatarUrl
                ? <Image source={{ uri: profile.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                : <Text style={styles.avatarText}>{initials}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.idName}>{firstName.toUpperCase()} {lastName.toUpperCase()}</Text>
              <Text style={styles.idMeta}>
                {profile?.category?.toUpperCase() ?? '—'} · {profile?.weightClass ?? '—'} · {profile?.stance?.toUpperCase() ?? '—'}
              </Text>
            </View>
          </View>
          <Pressable style={styles.editProfileBtn} onPress={() => router.push('/edit-profile')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="create-outline" size={11} color={t.crimson} />
              <Text style={styles.editProfileText}>MODIFIER LE PROFIL</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Belt card ────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>GRADE BJJ</Text>
            {isCoach && (
              <Pressable onPress={() => router.push('/edit-belt')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="create-outline" size={11} color={t.crimson} />
                  <Text style={styles.editText}>MODIFIER</Text>
                </View>
              </Pressable>
            )}
          </View>
          <BJJBelt color={beltColor} height={32} />
          <View style={styles.beltRow}>
            <Text style={styles.beltName}>{beltColorLabel}</Text>
          </View>
          <Text style={styles.beltPromo}>
            Promu le {beltPromoDate} par{' '}
            <Text style={{ color: t.bone, fontWeight: '600' }}>{beltPromoBy}</Text>
          </Text>
          {/* Belt progression */}
          <View style={styles.beltProg}>
            {BELT_ORDER.map((b) => {
              const active = b === beltColor;
              return (
                <View key={b} style={styles.beltProgCell}>
                  <View style={[styles.beltProgSwatch, {
                    backgroundColor: BELT_COLORS[b],
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? t.crimson : 'rgba(0,0,0,0.55)',
                    opacity: active ? 1 : 0.55,
                  }]} />
                  <Text style={[styles.beltProgLabel, { color: active ? t.crimson : t.textMute }]}>
                    {BELT_LABEL[b]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Stats row ────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {([
            ['—', 'COURS', '/mon-activite'],
            [String(palmares.length).padStart(2, '0'), 'COMPÉT.', '/palmares'],
            ['—', 'COVOIT.', '/mes-covoiturages'],
          ] as [string, string, string][]).map(([v, l, path], i) => (
            <Pressable key={i} style={[styles.statCell, i < 2 && styles.statBorder]} onPress={() => router.push(path as any)}>
              <Text style={styles.statValue}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Palmarès section ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.cardLabel}>PALMARÈS · {palmares.length} COMPÉT.</Text>
          <Pressable onPress={() => router.push('/palmares')}>
            <Text style={styles.seeAll}>VOIR TOUT →</Text>
          </Pressable>
        </View>

        {/* Medal count cards */}
        <View style={styles.medalRow}>
          {[
            { place: 1, count: gold, label: 'OR' },
            { place: 2, count: silver, label: 'ARG' },
            { place: 3, count: bronze, label: 'BR' },
            { place: 4, count: top4, label: 'TOP 4' },
          ].map((item, i) => (
            <View key={i} style={styles.medalCard}>
              <MedalDisc place={item.place} size={26} t={t} />
              <View>
                <Text style={styles.medalCount}>{item.count}</Text>
                <Text style={styles.medalLabel}>{item.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent results */}
        <View style={styles.resultList}>
          {recentResults.map((r, i) => (
            <View key={i} style={[styles.resultRow, i > 0 && styles.resultBorder]}>
              <MedalDisc place={r.place} size={32} t={t} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{r.competitionName}</Text>
                <Text style={styles.resultMeta}>{r.compDate} · {r.weightClass ?? ''}</Text>
              </View>
              {r.compType && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{r.comp_type}</Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </View>
          ))}
        </View>

        {/* ── Activité section ─────────────────────────────── */}
        <Pressable style={styles.sectionHeader} onPress={() => router.push('/mon-activite')}>
          <Text style={styles.cardLabel}>MON ACTIVITÉ</Text>
          <Text style={styles.seeAll}>VOIR TOUT →</Text>
        </Pressable>

        {/* ── Covoiturages section ──────────────────────────── */}
        <Pressable style={styles.sectionHeader} onPress={() => router.push('/mes-covoiturages')}>
          <Text style={styles.cardLabel}>MES COVOITURAGES</Text>
          <Text style={styles.seeAll}>VOIR TOUT →</Text>
        </Pressable>

        {/* ── Settings links ────────────────────────────────── */}
        <View style={styles.card}>
          {([
            ['settings-outline', 'Paramètres', '/settings'],
            ['lock-closed-outline', 'Confidentialité', '/settings'],
            ['notifications-outline', 'Notifications', '/settings'],
          ] as [string, string, string][]).map(([icon, label, path], i) => (
            <Pressable
              key={i}
              style={[styles.settingsRow, i < 2 && styles.settingsRowBorder]}
              onPress={() => router.push(path as any)}
            >
              <Ionicons name={icon as any} size={18} color={t.textDim} />
              <Text style={styles.settingsLabel}>{label}</Text>
              <Text style={styles.settingsArrow}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Footer ───────────────────────────────────────── */}
        <Text style={styles.footer}>RONIN FIGHT TEAM — v1.0 (BETA)</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
      paddingHorizontal: 24, paddingBottom: 14, paddingTop: 8,
    },
    memberId: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    title: { fontFamily: FONTS.display, fontSize: 44, color: t.bone, fontWeight: '900', letterSpacing: 1 },
    settingsBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    settingsIcon: { fontSize: 22 },
    scroll: { paddingHorizontal: 20, gap: 12 },

    // Identity card
    idCard: {
      padding: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, overflow: 'hidden',
    },
    idGlow: {
      position: 'absolute', top: -30, right: -30,
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: t.crimson, opacity: 0.15,
    },
    idRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    avatar: {
      width: 54, height: 54, backgroundColor: t.crimson, borderWidth: 1.5,
      borderColor: t.crimsonDeep, borderRadius: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: FONTS.display, fontSize: 20, color: t.bone, fontWeight: '900' },
    idName: { fontFamily: FONTS.display, fontSize: 22, color: t.bone, fontWeight: '900', letterSpacing: 0.5 },
    idMeta: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 1.5, marginTop: 2 },
    editProfileBtn: { alignSelf: 'flex-end', marginTop: 10 },
    editProfileText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.crimson, letterSpacing: 1.5 },

    // Card
    card: {
      padding: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2 },
    editText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.crimson, letterSpacing: 1.5 },

    // Belt
    beltRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12 },
    beltName: { fontFamily: FONTS.display, fontSize: 20, color: t.bone, fontWeight: '900', letterSpacing: 0.5 },
    beltDuration: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5 },
    beltPromo: { fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim, marginTop: 4 },
    beltProg: { flexDirection: 'row', gap: 6, marginTop: 14 },
    beltProgCell: { flex: 1, alignItems: 'center', gap: 4 },
    beltProgSwatch: { width: '100%', height: 18, borderRadius: 2 },
    beltProgLabel: { fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1 },

    // Stats
    statsRow: { flexDirection: 'row', borderWidth: 1, borderColor: t.hairline, borderRadius: 3 },
    statCell: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' },
    statBorder: { borderRightWidth: 1, borderRightColor: t.hairline },
    statValue: { fontFamily: FONTS.display, fontSize: 28, color: t.crimson, fontWeight: '900', lineHeight: 30 },
    statLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginTop: 4 },

    // Section header
    sectionHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4,
    },
    seeAll: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, letterSpacing: 1.5 },

    // Medal row
    medalRow: { flexDirection: 'row', gap: 6 },
    medalCard: {
      flex: 1, padding: 10, backgroundColor: t.surface, borderWidth: 1,
      borderColor: t.hairline, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    medalCount: { fontFamily: FONTS.display, fontSize: 18, color: t.bone, fontWeight: '900', lineHeight: 20 },
    medalLabel: { fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1.5 },

    // Result list
    resultList: { paddingHorizontal: 4 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    resultBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    resultName: { fontFamily: FONTS.body, fontSize: 12.5, color: t.bone, fontWeight: '700' },
    resultMeta: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1, marginTop: 2 },
    tag: { paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: t.crimson, borderRadius: 2 },
    tagText: { fontFamily: FONTS.mono, fontSize: 8.5, color: t.crimson, letterSpacing: 1 },
    chevron: { fontSize: 18, color: t.textMute, lineHeight: 20 },

    // Carpool card
    carpoolCard: {
      padding: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    carpoolBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    carpoolBadgeText: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textDim, letterSpacing: 1 },
    upcomingPill: {
      backgroundColor: t.crimson, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2,
    },
    upcomingText: { fontFamily: FONTS.mono, fontSize: 8, color: t.bone, letterSpacing: 1.5, fontWeight: '700' },
    carpoolEvent: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700' },
    carpoolRoute: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textDim, letterSpacing: 1, marginTop: 3 },
    carpoolPassengers: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, marginTop: 3 },

    // Settings rows
    settingsRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12,
    },
    settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: t.hairline },
    settingsIcon2: { fontSize: 16 },
    settingsLabel: { flex: 1, fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '500' },
    settingsArrow: { fontSize: 18, color: t.textMute },

    footer: {
      fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5,
      textAlign: 'center', marginTop: 8,
    },
  });
}
