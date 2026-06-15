import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Competition } from '@/lib/database.types';
import { api } from '@/lib/api';

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

interface CarpoolItem {
  id: string;
  departure_city: string;
  departure_at: string;
  seats_taken: number;
  seats_total: number;
  cost_per_seat: number;
  driverName: string;
}

export default function CompetitionDetailScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [loadingComp, setLoadingComp] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [carpools, setCarpools] = useState<CarpoolItem[]>([]);

  useEffect(() => {
    if (!id) return;

    api.get<Competition>(`/api/competitions/${id}`)
      .then((data) => { setCompetition(data ?? null); setLoadingComp(false); })
      .catch(() => setLoadingComp(false));

    api.get<{ carpools: any[] }>('/api/carpools')
      .then(({ carpools }) => {
        setCarpools(
          (carpools ?? [])
            .filter((c: any) => c.competitionId === id)
            .map((c: any) => ({
              id:             c.id,
              departure_city: c.departureCity,
              departure_at:   c.departureAt,
              seats_taken:    c.seatsTaken,
              seats_total:    c.seatsTotal,
              cost_per_seat:  Number(c.costPerSeat ?? 0),
              driverName:     c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Inconnu',
            }))
        );
      })
      .catch(() => {});

    // Check if already registered
    api.get<{ registrations: Array<{ id: string; competitionId: string }> }>('/api/competitions')
      .then(({ registrations }) => {
        const reg = registrations.find((r) => r.competitionId === id);
        setRegistrationId(reg?.id ?? null);
      })
      .catch(() => {});
  }, [id, user]);

  const handleRegister = async () => {
    if (!user || !id || registering) return;
    setRegistering(true);
    setStatusMsg(null);

    if (registrationId) {
      try {
        await api.delete(`/api/competitions/registrations/${registrationId}`);
        setRegistrationId(null);
        setStatusMsg('Désinscription effectuée.');
      } catch {
        setStatusMsg('Erreur lors de la désinscription.');
      }
    } else {
      try {
        const reg = await api.post<{ id: string }>(`/api/competitions/${id}/register`, {});
        setRegistrationId(reg.id);
        setStatusMsg('Inscription enregistrée !');
      } catch {
        setStatusMsg('Erreur lors de l\'inscription.');
      }
    }

    setRegistering(false);
  };

  if (loadingComp) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={t.crimson} />
      </View>
    );
  }

  const comp = competition;
  const isRegistered = !!registrationId;

  function formatCompDate(iso: string) {
    const d = new Date(iso);
    const day = d.toLocaleString('fr-FR', { weekday: 'short' }).toUpperCase();
    const date = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    return `${day} ${date} ${month} ${year}`;
  }

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
              <Ionicons name="location-outline" size={16} color={t.bone} />
            </Pressable>
            <Pressable style={styles.heroActionBtn}>
              <Ionicons name="bookmark-outline" size={16} color={t.bone} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.heroContent}>
          <View style={styles.heroTags}>
            {comp?.status && <Tag text={comp.status.toUpperCase()} filled t={t} />}
            {comp?.comp_type && <Tag text={comp.comp_type} color={t.bone} t={t} />}
          </View>
          <Text style={styles.heroTitle}>{comp?.name.toUpperCase() ?? ''}</Text>
        </View>
      </View>

      {/* Quick facts */}
      <View style={styles.facts}>
        {[
          [comp ? formatCompDate(comp.comp_date) : '—', ''],
          [comp?.location ?? '—', ''],
          ['INSCRIPTION', comp?.status.toUpperCase() ?? '—'],
        ].map(([a, b], i) => (
          <View key={i} style={[styles.factCell, i < 2 && styles.factBorder]}>
            <Text style={styles.factLabel}>{a}</Text>
            {b ? <Text style={styles.factValue}>{b}</Text> : null}
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Brief */}
        {comp?.registration_deadline && (
          <>
            <Text style={styles.sectionLabel}>CLÔTURE DES INSCRIPTIONS</Text>
            <Text style={styles.brief}>{comp.registration_deadline}</Text>
          </>
        )}

        {/* Covoiturages */}
        <>
          <View style={styles.covHeader}>
            <Text style={styles.sectionLabel}>
              COVOITURAGES{carpools.length > 0 ? ` — ${carpools.length}` : ''}
            </Text>
            <Pressable onPress={() => router.push('/create-carpool')}>
              <Text style={styles.covPropose}>+ PROPOSER</Text>
            </Pressable>
          </View>

          {carpools.length === 0 ? (
            <Text style={styles.covEmpty}>Aucun covoiturage proposé</Text>
          ) : carpools.map((c) => {
            const full = c.seats_taken >= c.seats_total;
            const dep = new Date(c.departure_at);
            const depStr = dep.toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).toUpperCase();
            return (
              <View key={c.id} style={[styles.covCard, full && { opacity: 0.6 }]}>
                <View style={styles.covCardIcon}>
                  <Ionicons name="car-outline" size={20} color={t.textDim} />
                </View>
                <View style={styles.covInfo}>
                  <Text style={styles.covRoute}>{c.departure_city}</Text>
                  <Text style={styles.covMeta}>Départ {depStr} · {c.driverName}</Text>
                </View>
                <View style={styles.covSeats}>
                  <Text style={styles.covSeatCount}>{c.seats_taken}/{c.seats_total}</Text>
                  <Text style={[styles.covSeatLabel, full && { color: t.textMute }]}>
                    {full ? 'COMPLET' : c.cost_per_seat > 0 ? `${c.cost_per_seat}€` : 'GRATUIT'}
                  </Text>
                </View>
              </View>
            );
          })}
        </>

        {statusMsg && (
          <Text style={[styles.statusMsg, isRegistered && { color: '#22C55E' }]}>{statusMsg}</Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} style={styles.cta}>
        <Pressable
          style={[styles.ctaPrimary, isRegistered && styles.ctaPrimaryRegistered]}
          onPress={handleRegister}
          disabled={registering}
        >
          {registering ? (
            <ActivityIndicator color={t.bone} />
          ) : (
            <Text style={styles.ctaPrimaryText}>
              {isRegistered ? 'SE DÉSINSCRIRE' : 'JE M\'INSCRIS'}
            </Text>
          )}
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
    covHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    covPropose: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, letterSpacing: 1.5 },
    covEmpty: { fontFamily: FONTS.body, fontSize: 13, color: t.textMute, marginBottom: 18 },
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
    statusMsg: {
      fontFamily: FONTS.body, fontSize: 13, color: '#FF4444',
      textAlign: 'center', marginTop: 12,
    },
    cta: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
      backgroundColor: t.ink,
    },
    ctaPrimary: {
      flex: 1, height: 50, backgroundColor: t.crimson, borderRadius: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaPrimaryRegistered: {
      backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong,
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
