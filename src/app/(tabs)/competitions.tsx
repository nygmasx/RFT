import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachCompetitions } from '@/components/coach-competitions';
import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { Chip, EmptyState, IconButton, ScreenHeader, SegmentedControl, Surface } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCompetitions } from '@/hooks/useCompetitions';
import { api } from '@/lib/api';
import { Competition, Registration } from '@/lib/database.types';
import { haptics } from '@/lib/haptics';

const TABS = ['À venir', 'Mes inscriptions', 'Résultats'] as const;

const RESULT_LABELS: Record<string, string> = {
  champion: '1er',
  finalist: '2e',
  semifinal: '1/2',
  quarterfinal: '1/4',
  round_of_16: '1/8',
  round_of_32: '1/16',
  participant: 'Part.',
};

const STATUS_LABELS: Record<Competition['status'], string> = {
  open: 'Inscriptions ouvertes',
  soon: 'Bientôt',
  closed: 'Clôturé',
};

function formatDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
    year: String(date.getFullYear()),
  };
}

function formatDeadline(value: string | null) {
  if (!value) return 'À confirmer';
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
}

export default function CompetitionsScreen() {
  const { user } = useAuth();
  const isCoach = user?.role === 'coach' || user?.role === 'admin';
  return isCoach ? <CoachCompetitions /> : <MemberCompetitionsScreen />;
}

function MemberCompetitionsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { upcoming, registrations, loading, refetch } = useCompetitions();
  const today = new Date().toISOString().split('T')[0] ?? '';
  const futureRegistrations = registrations.filter((registration) => !registration.competitions || registration.competitions.comp_date >= today);
  const pastRegistrations = registrations.filter((registration) => registration.competitions && registration.competitions.comp_date < today);
  const openCount = upcoming.filter((competition) => competition.status === 'open').length;

  const handleUnregister = (registrationId: string) => {
    Alert.alert('Se désinscrire', 'Confirmer la désinscription à cette compétition ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se désinscrire',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/competitions/registrations/${registrationId}`);
            haptics.success();
            void refetch();
          } catch (error: unknown) {
            haptics.error();
            Alert.alert('Désinscription impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
          }
        },
      },
    ]);
  };

  const refresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          eyebrow="SAISON 2025–2026 · ÉQUIPE RFT"
          title="COMPÉTITIONS"
          action={<IconButton icon="calendar-outline" label="Ouvrir le calendrier" onPress={() => router.push('/calendar')} />}
        />

        <View style={styles.summary}>
          <Summary value={upcoming.length} label="À VENIR" styles={styles} />
          <Summary value={openCount} label="OUVERTES" accent styles={styles} />
          <Summary value={futureRegistrations.length} label="INSCRIT(E)" styles={styles} last />
        </View>
        <SegmentedControl items={TABS} selectedIndex={activeTab} onChange={setActiveTab} />
      </SafeAreaView>

      {loading ? (
        <View accessibilityLabel="Chargement des compétitions" style={styles.loader}>
          <ActivityIndicator color={theme.crimson} />
          <Text style={styles.loaderText}>Préparation du calendrier…</Text>
        </View>
      ) : (
        <ScrollView
          alwaysBounceVertical
          bounces
          contentContainerStyle={styles.scroll}
          decelerationRate="normal"
          refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.listIntro}>
              <View>
                <Text style={styles.listEyebrow}>{activeTab === 0 ? 'PROCHAINS OBJECTIFS' : activeTab === 1 ? 'MON CALENDRIER' : 'MON PARCOURS'}</Text>
                <Text style={styles.listTitle}>{activeTab === 0 ? `${upcoming.length} rendez-vous` : activeTab === 1 ? `${futureRegistrations.length} inscription${futureRegistrations.length > 1 ? 's' : ''}` : `${pastRegistrations.length} participation${pastRegistrations.length > 1 ? 's' : ''}`}</Text>
              </View>
              <Ionicons name={activeTab === 2 ? 'medal-outline' : 'flag-outline'} size={21} color={activeTab === 2 ? theme.gold : theme.crimson} />
            </View>

            {activeTab === 0 ? (
              upcoming.length > 0 ? upcoming.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} theme={theme} styles={styles} />
              )) : (
                <EmptyState icon="trophy-outline" title="Aucune compétition annoncée" message="Les prochains objectifs sportifs publiés par le club apparaîtront ici." actionLabel="Voir le calendrier" onAction={() => router.push('/calendar')} />
              )
            ) : null}

            {activeTab === 1 ? (
              futureRegistrations.length > 0 ? futureRegistrations.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} onUnregister={handleUnregister} theme={theme} styles={styles} />
              )) : (
                <EmptyState icon="ticket-outline" title="Aucune inscription en cours" message="Choisissez une compétition à venir pour rejoindre l’équipe engagée." actionLabel="Découvrir les compétitions" onAction={() => setActiveTab(0)} />
              )
            ) : null}

            {activeTab === 2 ? (
              pastRegistrations.length > 0 ? pastRegistrations.map((registration) => (
                <ResultCard key={registration.id} registration={registration} theme={theme} styles={styles} />
              )) : (
                <EmptyState icon="medal-outline" title="Votre parcours commence ici" message="Vos compétitions passées et leurs résultats validés seront regroupés dans cet espace." />
              )
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Summary({ value, label, accent, last, styles }: { value: number; label: string; accent?: boolean; last?: boolean; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.summaryCell, last && styles.summaryCellLast]}>
      <Text style={[styles.summaryValue, accent && styles.summaryValueAccent]}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function DateTile({ date, theme, styles }: { date: string; theme: Theme; styles: ReturnType<typeof makeStyles> }) {
  const formatted = formatDate(date);
  return (
    <View style={styles.dateTile}>
      <Text style={styles.dateMonth}>{formatted.month}</Text>
      <Text style={styles.dateDay}>{formatted.day}</Text>
      <View style={styles.dateRule} />
      <Text style={styles.dateYear}>{formatted.year}</Text>
      <View style={[styles.dateCorner, { backgroundColor: theme.crimson }]} />
    </View>
  );
}

function CompetitionCard({ competition, theme, styles }: { competition: Competition; theme: Theme; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable
      accessibilityHint="Ouvre le détail et les inscriptions"
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/competition-detail', params: { id: competition.id } })}
      style={({ pressed }) => [styles.competitionCard, pressed && styles.pressed]}
    >
      <View style={styles.cardMain}>
        <DateTile date={competition.comp_date} theme={theme} styles={styles} />
        <View style={styles.cardCopy}>
          <View style={styles.chips}>
            {competition.comp_type ? <Chip label={competition.comp_type} /> : null}
            <Chip label={STATUS_LABELS[competition.status]} tone={competition.status === 'open' ? 'success' : competition.status === 'soon' ? 'warning' : 'muted'} />
          </View>
          <Text numberOfLines={3} style={styles.cardName}>{competition.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={theme.textMute} />
            <Text numberOfLines={1} style={styles.location}>{competition.location || 'Lieu à confirmer'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.deadline}>
          <Text style={styles.footerLabel}>CLÔTURE</Text>
          <Text style={styles.footerValue}>{formatDeadline(competition.registration_deadline)}</Text>
        </View>
        <View style={styles.openAction}>
          <Text style={styles.openActionText}>VOIR LA FICHE</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.crimson} />
        </View>
      </View>
    </Pressable>
  );
}

function RegistrationCard({ registration, onUnregister, theme, styles }: { registration: Registration; onUnregister: (id: string) => void; theme: Theme; styles: ReturnType<typeof makeStyles> }) {
  const competition = registration.competitions;
  if (!competition) return null;
  const confirmed = registration.status === 'confirmé';

  return (
    <Surface accent={confirmed ? 'crimson' : undefined} style={styles.registrationCard}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/competition-detail', params: { id: competition.id } })}
        style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
      >
        <DateTile date={competition.comp_date} theme={theme} styles={styles} />
        <View style={styles.cardCopy}>
          <View style={styles.chips}>
            {competition.comp_type ? <Chip label={competition.comp_type} /> : null}
            <Chip label={confirmed ? 'Confirmé' : 'En attente'} tone={confirmed ? 'success' : 'warning'} />
          </View>
          <Text numberOfLines={3} style={styles.cardName}>{competition.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={theme.textMute} />
            <Text numberOfLines={1} style={styles.location}>{competition.location || 'Lieu à confirmer'}</Text>
          </View>
          {registration.weight_class ? <Text style={styles.weightClass}>{registration.weight_class}</Text> : null}
        </View>
      </Pressable>
      <View style={styles.carpoolRow}>
        <View style={styles.carpoolIcon}><Ionicons name="car-outline" size={17} color={theme.bone} /></View>
        <View style={styles.carpoolCopy}>
          <Text style={styles.carpoolTitle}>Trajet d’équipe</Text>
          <Text style={styles.carpoolText}>Aucun covoiturage associé</Text>
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.navigate('/(tabs)/covoiturage')} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.carpoolAction}>TROUVER</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onUnregister(registration.id)}
        style={({ pressed }) => [styles.unregisterButton, pressed && styles.pressed]}
      >
        <Text style={styles.unregisterText}>SE DÉSINSCRIRE</Text>
      </Pressable>
    </Surface>
  );
}

function ResultCard({ registration, theme, styles }: { registration: Registration; theme: Theme; styles: ReturnType<typeof makeStyles> }) {
  const competition = registration.competitions;
  if (!competition) return null;
  const result = registration.result;
  const approved = result?.validationStatus === 'approved';
  const pending = result?.validationStatus === 'pending';
  const rejected = result?.validationStatus === 'rejected';

  return (
    <Surface accent={approved ? 'gold' : undefined} style={styles.resultCard}>
      <View style={styles.resultMain}>
        <View style={[styles.resultDisc, approved && styles.resultDiscApproved]}>
          <Text style={[styles.resultPlace, approved && { color: theme.gold }]}>{result ? RESULT_LABELS[result.resultStage] : '—'}</Text>
          <Text style={styles.resultLabel}>PLACE</Text>
        </View>
        <View style={styles.resultCopy}>
          <View style={styles.chips}>
            {competition.comp_type ? <Chip label={competition.comp_type} tone="muted" /> : null}
            {registration.weight_class ? <Chip label={registration.weight_class} tone="muted" /> : null}
          </View>
          <Text numberOfLines={2} style={styles.resultName}>{competition.name}</Text>
          <Text style={styles.resultDate}>{formatDate(competition.comp_date).day} {formatDate(competition.comp_date).month} {formatDate(competition.comp_date).year}</Text>
        </View>
      </View>

      {pending ? (
        <View style={styles.resultStatus}><Ionicons name="time-outline" size={17} color={theme.warning} /><Text style={[styles.resultStatusText, { color: theme.warning }]}>Validation du coach en attente</Text></View>
      ) : approved ? (
        <View style={styles.resultStatus}><Ionicons name="checkmark-circle-outline" size={17} color={theme.success} /><Text style={[styles.resultStatusText, { color: theme.success }]}>Validé · comptabilisé au classement</Text></View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/add-result', params: { competitionId: competition.id } })}
          style={({ pressed }) => [styles.resultAction, pressed && styles.pressed]}
        >
          <Text style={styles.resultActionText}>{rejected ? 'CORRIGER ET RENVOYER' : 'SAISIR MON RÉSULTAT'}</Text>
          <Ionicons name="arrow-forward" size={15} color="#FFF" />
        </Pressable>
      )}
    </Surface>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.ink },
    summary: { minHeight: 68, marginHorizontal: Layout.gutter, marginBottom: 10, flexDirection: 'row', backgroundColor: theme.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: theme.hairline },
    summaryCell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.hairline },
    summaryCellLast: { borderRightWidth: 0 },
    summaryValue: { color: theme.bone, fontFamily: FONTS.display, fontSize: 21, fontWeight: '900' },
    summaryValueAccent: { color: theme.crimson },
    summaryLabel: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loaderText: { color: theme.textDim, fontSize: 13 },
    scroll: { paddingVertical: 18, paddingBottom: 30 },
    content: { width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: Layout.gutter, gap: 12 },
    pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
    listIntro: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listEyebrow: { color: theme.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
    listTitle: { color: theme.bone, fontFamily: FONTS.display, fontSize: 20, fontWeight: '900', marginTop: 3 },
    competitionCard: { overflow: 'hidden', backgroundColor: theme.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: theme.hairline },
    registrationCard: { overflow: 'hidden' },
    cardMain: { minHeight: 144, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    dateTile: { width: 66, height: 104, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.ink, borderRadius: Radii.md, borderWidth: 1, borderColor: theme.hairlineStrong },
    dateMonth: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
    dateDay: { color: theme.crimson, fontFamily: FONTS.display, fontSize: 32, fontWeight: '900', lineHeight: 34, marginTop: 2 },
    dateRule: { width: 18, height: 1, backgroundColor: theme.hairlineStrong, marginVertical: 4 },
    dateYear: { color: theme.textDim, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1 },
    dateCorner: { position: 'absolute', width: 18, height: 18, right: -9, top: -9, transform: [{ rotate: '45deg' }] },
    cardCopy: { flex: 1, minWidth: 0, paddingTop: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 9 },
    cardName: { color: theme.bone, fontFamily: FONTS.display, fontSize: 19, fontWeight: '900', lineHeight: 21, textTransform: 'uppercase' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
    location: { flex: 1, color: theme.textDim, fontSize: 12 },
    weightClass: { color: theme.gold, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 8 },
    cardFooter: { minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.hairline, backgroundColor: theme.elevated },
    deadline: { gap: 2 },
    footerLabel: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.9 },
    footerValue: { color: theme.bone, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
    openAction: { minHeight: Layout.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 6 },
    openActionText: { color: theme.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    carpoolRow: { minHeight: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.elevated, borderTopWidth: 1, borderTopColor: theme.hairline },
    carpoolIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
    carpoolCopy: { flex: 1 },
    carpoolTitle: { color: theme.bone, fontSize: 12, fontWeight: '800' },
    carpoolText: { color: theme.textMute, fontSize: 10, marginTop: 2 },
    carpoolAction: { color: theme.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    unregisterButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: theme.hairline },
    unregisterText: { color: theme.textDim, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
    resultCard: { overflow: 'hidden' },
    resultMain: { minHeight: 126, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
    resultDisc: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.hairlineStrong },
    resultDiscApproved: { backgroundColor: `${theme.gold}10`, borderColor: `${theme.gold}66` },
    resultPlace: { color: theme.textDim, fontFamily: FONTS.display, fontSize: 19, fontWeight: '900', textTransform: 'uppercase' },
    resultLabel: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.8, marginTop: 1 },
    resultCopy: { flex: 1, minWidth: 0 },
    resultName: { color: theme.bone, fontFamily: FONTS.display, fontSize: 17, fontWeight: '900', lineHeight: 20, textTransform: 'uppercase' },
    resultDate: { color: theme.textDim, fontSize: 11, marginTop: 6, textTransform: 'capitalize' },
    resultStatus: { minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.elevated, borderTopWidth: 1, borderTopColor: theme.hairline },
    resultStatusText: { flex: 1, fontSize: 11, fontWeight: '800' },
    resultAction: { minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.crimson },
    resultActionText: { color: '#FFF', fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  });
}
