import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAdminClub } from '@/hooks/useClubManagement';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';

type Tab = 'planning' | 'presences' | 'finances' | 'acquisition' | 'messages';
type Member = { id: string; firstName: string; lastName: string; status: string; role: string };
type Roster = {
  bookings: { id: string; status: string; firstName: string | null; lastName: string | null; familyFirstName: string | null; familyLastName: string | null }[];
  trials: { id: string; status: string; firstName: string; lastName: string; email: string }[];
};

const TABS: [Tab, string][] = [
  ['planning', 'PLANNING'], ['presences', 'PRÉSENCES'], ['finances', 'FINANCES'], ['acquisition', 'INSCRIPTIONS'], ['messages', 'EMAIL'],
];

const today = () => new Date().toISOString().slice(0, 10);
const money = (cents: number, currency = 'EUR') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);

export default function AdminClubScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const { data, loading, error, refetch } = useAdminClub();
  const [tab, setTab] = useState<Tab>('planning');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  const [sessionTitle, setSessionTitle] = useState('Cours adultes');
  const [sessionDate, setSessionDate] = useState(today());
  const [sessionTime, setSessionTime] = useState('19:30');
  const [sessionEndTime, setSessionEndTime] = useState('21:00');
  const [sessionDiscipline, setSessionDiscipline] = useState('BJJ');
  const [sessionPlace, setSessionPlace] = useState('Dojo RFT');
  const [sessionCapacity, setSessionCapacity] = useState('30');
  const [sessionRepeat, setSessionRepeat] = useState('1');

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [roster, setRoster] = useState<Roster | null>(null);

  const [planName, setPlanName] = useState('Adhésion annuelle');
  const [planPrice, setPlanPrice] = useState('350');
  const [planCheckout, setPlanCheckout] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignAudience, setCampaignAudience] = useState('all');

  const [formTitle, setFormTitle] = useState('Rejoindre Ronin Fight Team');
  const [profileDescription, setProfileDescription] = useState(data?.profile?.description ?? 'Club de Jiu-Jitsu Brésilien et grappling à Montataire.');
  const [profileAddress, setProfileAddress] = useState(data?.profile?.address ?? '');

  const isStaff = user?.role === 'coach' || user?.role === 'admin';

  const loadMembers = async () => {
    if (members.length) return;
    const rows = await api.get<Member[]>('/api/profile/all');
    setMembers(rows.filter((member) => member.status === 'approved' && member.role === 'member'));
  };

  const changeTab = (next: Tab) => {
    setTab(next); setNotice('');
    if (next === 'finances') void loadMembers();
  };

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([refetch(), members.length ? api.get<Member[]>('/api/profile/all').then((rows) => setMembers(rows.filter((m) => m.status === 'approved' && m.role === 'member'))) : Promise.resolve()]).finally(() => setRefreshing(false));
  };

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key); setNotice('');
    try { await action(); await refetch(); setNotice(success); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Action impossible'); }
    finally { setBusy(''); }
  };

  const createSession = () => run('session', () => api.post('/api/club/admin/sessions', {
    title: sessionTitle,
    sessionDate,
    startTime: sessionTime,
    endTime: sessionEndTime || null,
    discipline: sessionDiscipline,
    place: sessionPlace,
    capacity: Number(sessionCapacity),
    repeatWeeks: Number(sessionRepeat),
    trialAllowed: true,
    seasonId: data?.seasons.find((season) => season.status === 'active')?.id ?? null,
  }), 'Cours ajouté au planning.');

  const openRoster = async (sessionId: string) => {
    setSelectedSessionId(sessionId); setBusy('roster'); setNotice('');
    try { setRoster(await api.get<Roster>(`/api/club/admin/sessions/${sessionId}/roster`)); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Liste indisponible'); }
    finally { setBusy(''); }
  };

  const attendance = async (kind: 'bookings' | 'trials', id: string, status: string) => {
    setBusy(id);
    try {
      await api.put(`/api/club/admin/${kind}/${id}/attendance`, { status });
      await openRoster(selectedSessionId);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Mise à jour impossible'); }
    finally { setBusy(''); }
  };

  if (!isStaff) return <View style={styles.center}><Text style={styles.muted}>Accès réservé au staff.</Text></View>;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => safeBack('/(tabs)/accueil')}><Ionicons name="chevron-back" size={22} color={t.bone} /></Pressable>
          <View style={styles.flex}><Text style={styles.eyebrow}>ADMINISTRATION</Text><Text style={styles.title}>GESTION DU CLUB</Text></View>
          <Pressable style={styles.preview} onPress={() => router.push('/club-public' as never)}><Ionicons name="eye-outline" size={18} color={t.crimson} /></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map(([key, label]) => <Pressable key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => changeTab(key)}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text></Pressable>)}
        </ScrollView>
      </SafeAreaView>

      {loading ? <View style={styles.center}><ActivityIndicator color={t.crimson} /></View> : (
        <FormScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.crimson} />}>
          {!!(error || notice) && <Text style={[styles.notice, !!error && styles.error]}>{error || notice}</Text>}

          {tab === 'planning' && <>
            <Metrics values={[
              [String(data?.sessions.length ?? 0), 'COURS À VENIR'],
              [String(data?.sessions.reduce((sum, session) => sum + session.bookedCount, 0) ?? 0), 'RÉSERVATIONS'],
              [String(data?.seasons.filter((season) => season.status === 'active').length ?? 0), 'SAISON ACTIVE'],
            ]} styles={styles} />
            <Section text="CRÉER UN COURS" styles={styles} />
            <View style={styles.card}>
              <Field label="TITRE" value={sessionTitle} onChangeText={setSessionTitle} styles={styles} t={t} />
              <View style={styles.twoCols}><View style={styles.flex}><Field label="DATE" value={sessionDate} onChangeText={setSessionDate} styles={styles} t={t} /></View><View style={styles.flex}><Field label="DÉBUT" value={sessionTime} onChangeText={setSessionTime} styles={styles} t={t} /></View></View>
              <View style={styles.twoCols}><View style={styles.flex}><Field label="FIN" value={sessionEndTime} onChangeText={setSessionEndTime} styles={styles} t={t} /></View><View style={styles.flex}><Field label="PLACES" value={sessionCapacity} onChangeText={setSessionCapacity} keyboardType="number-pad" styles={styles} t={t} /></View></View>
              <Field label="RÉPÉTER PENDANT (SEMAINES)" value={sessionRepeat} onChangeText={setSessionRepeat} keyboardType="number-pad" styles={styles} t={t} />
              <Field label="DISCIPLINE" value={sessionDiscipline} onChangeText={setSessionDiscipline} styles={styles} t={t} />
              <Field label="LIEU" value={sessionPlace} onChangeText={setSessionPlace} styles={styles} t={t} />
              <Primary label="AJOUTER AU PLANNING" busy={busy === 'session'} onPress={createSession} styles={styles} />
            </View>
            <Section text="PROCHAINS COURS" styles={styles} />
            {data?.sessions.map((session) => <View key={session.id} style={styles.listRow}><View style={styles.dateSquare}><Text style={styles.dateDay}>{session.sessionDate.slice(8)}</Text><Text style={styles.dateMonth}>{new Date(`${session.sessionDate}T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</Text></View><View style={styles.flex}><Text style={styles.listTitle}>{session.title}</Text><Text style={styles.meta}>{session.startTime.slice(0, 5)} · {session.bookedCount}/{session.capacity} · {session.place}</Text></View><Pressable style={styles.smallAction} onPress={() => { setTab('presences'); void openRoster(session.id); }}><Text style={styles.smallActionText}>LISTE</Text></Pressable></View>)}
            <Section text="SAISONS" styles={styles} />
            {data?.seasons.map((season) => <View key={season.id} style={styles.listRow}><View style={styles.flex}><Text style={styles.listTitle}>{season.name}</Text><Text style={styles.meta}>{season.startDate} → {season.endDate}</Text></View><Status value={season.status} styles={styles} /></View>)}
            <Pressable style={styles.secondary} onPress={() => run('season', () => api.post('/api/club/admin/seasons', { name: `Saison ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`, startDate: `${new Date().getFullYear()}-09-01`, endDate: `${new Date().getFullYear() + 1}-08-31`, status: 'active' }), 'Nouvelle saison activée.')}><Text style={styles.secondaryText}>+ CRÉER LA PROCHAINE SAISON</Text></Pressable>
          </>}

          {tab === 'presences' && <>
            <Section text="CHOISIR UN COURS" styles={styles} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{data?.sessions.map((session) => <Pressable key={session.id} style={[styles.chip, selectedSessionId === session.id && styles.chipActive]} onPress={() => openRoster(session.id)}><Text style={[styles.chipText, selectedSessionId === session.id && styles.chipTextActive]}>{session.sessionDate.slice(5)} · {session.startTime.slice(0, 5)}</Text><Text style={[styles.chipSub, selectedSessionId === session.id && styles.chipTextActive]}>{session.title}</Text></Pressable>)}</ScrollView>
            {busy === 'roster' ? <ActivityIndicator color={t.crimson} style={{ marginTop: 30 }} /> : roster ? <>
              <Section text={`MEMBRES (${roster.bookings.length})`} styles={styles} />
              {roster.bookings.map((booking) => <AttendanceRow key={booking.id} name={`${booking.firstName ?? booking.familyFirstName ?? ''} ${booking.lastName ?? booking.familyLastName ?? ''}`} status={booking.status} busy={busy === booking.id} onStatus={(status) => attendance('bookings', booking.id, status)} styles={styles} t={t} />)}
              <Section text={`ESSAIS (${roster.trials.length})`} styles={styles} />
              {roster.trials.map((trial) => <AttendanceRow key={trial.id} name={`${trial.firstName} ${trial.lastName}`} subtitle={`ESSAI · ${trial.email}`} status={trial.status} busy={busy === trial.id} onStatus={(status) => attendance('trials', trial.id, status)} styles={styles} t={t} />)}
            </> : <Empty text="Sélectionne un cours pour faire l’appel." styles={styles} />}
          </>}

          {tab === 'finances' && <>
            <Metrics values={[
              [String(data?.memberships.filter((item) => item.status === 'active').length ?? 0), 'ADHÉSIONS ACTIVES'],
              [money(data?.memberships.reduce((sum, item) => sum + item.balanceCents, 0) ?? 0), 'RESTE À PAYER'],
              [money(data?.payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amountCents, 0) ?? 0), 'ENCAISSÉ'],
            ]} styles={styles} />
            <Section text="NOUVELLE FORMULE" styles={styles} />
            <View style={styles.card}><Field label="NOM" value={planName} onChangeText={setPlanName} styles={styles} t={t} /><Field label="PRIX (€)" value={planPrice} onChangeText={setPlanPrice} keyboardType="decimal-pad" styles={styles} t={t} /><Field label="LIEN DE PAIEMENT (OPTIONNEL)" value={planCheckout} onChangeText={setPlanCheckout} keyboardType="url" autoCapitalize="none" styles={styles} t={t} /><Primary label="CRÉER LA FORMULE" busy={busy === 'plan'} onPress={() => run('plan', () => api.post('/api/club/admin/plans', { name: planName, priceCents: Math.round(Number(planPrice.replace(',', '.')) * 100), billingInterval: 'season', checkoutUrl: planCheckout || null }), 'Formule créée.')} styles={styles} /></View>
            <Section text="ATTRIBUER UNE ADHÉSION" styles={styles} />
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>ÉLÈVE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>{members.map((member) => <Pill key={member.id} label={`${member.firstName} ${member.lastName}`} active={selectedMemberId === member.id} onPress={() => setSelectedMemberId(member.id)} styles={styles} />)}</ScrollView>
              <Text style={styles.fieldLabel}>FORMULE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>{data?.plans.filter((plan) => plan.active).map((plan) => <Pill key={plan.id} label={`${plan.name} · ${money(plan.priceCents, plan.currency)}`} active={selectedPlanId === plan.id} onPress={() => setSelectedPlanId(plan.id)} styles={styles} />)}</ScrollView>
              <Primary label="ACTIVER L’ADHÉSION" busy={busy === 'membership'} onPress={() => run('membership', () => api.post('/api/club/admin/memberships', { userId: selectedMemberId, planId: selectedPlanId, startDate: today() }), 'Adhésion activée.')} styles={styles} />
            </View>
            <Section text="SOLDES MEMBRES" styles={styles} />
            {data?.memberships.map((item) => <View key={item.id} style={styles.listRow}><View style={styles.flex}><Text style={styles.listTitle}>{item.firstName} {item.lastName}</Text><Text style={styles.meta}>{item.planName} · {item.status.toUpperCase()}</Text></View><View style={styles.right}><Text style={[styles.amount, item.balanceCents > 0 && { color: t.crimson }]}>{money(item.balanceCents)}</Text>{item.balanceCents > 0 && <><Pressable onPress={() => run(`remind:${item.id}`, () => api.post(`/api/club/admin/memberships/${item.id}/remind`, {}), 'Rappel envoyé.')}><Text style={styles.link}>ENVOYER UN RAPPEL</Text></Pressable><Pressable onPress={() => run(item.id, () => api.post('/api/club/admin/payments', { userId: item.userId, membershipId: item.id, amountCents: item.balanceCents, method: 'manual', status: 'paid' }), 'Paiement enregistré.')}><Text style={styles.link}>MARQUER PAYÉ</Text></Pressable></>}</View></View>)}
          </>}

          {tab === 'acquisition' && <>
            <Metrics values={[[String(data?.submissions.filter((item) => item.status === 'new').length ?? 0), 'NOUVELLES DEMANDES'], [String(data?.forms.length ?? 0), 'FORMULAIRES'], [String(data?.plans.filter((item) => item.active).length ?? 0), 'OFFRES PUBLIQUES']]} styles={styles} />
            <Section text="DEMANDES D’INSCRIPTION" styles={styles} />
            {data?.submissions.length ? data.submissions.map((submission) => <View key={submission.id} style={styles.card}><View style={styles.row}><View style={styles.flex}><Text style={styles.listTitle}>{submission.firstName} {submission.lastName}</Text><Text style={styles.meta}>{submission.email}{submission.phone ? ` · ${submission.phone}` : ''}</Text></View><Status value={submission.status} styles={styles} /></View><View style={styles.actionRow}><Pressable style={styles.secondarySmall} onPress={() => run(submission.id, () => api.put(`/api/club/admin/submissions/${submission.id}`, { status: 'contacted' }), 'Demande marquée contactée.')}><Text style={styles.secondaryText}>CONTACTÉ</Text></Pressable><Pressable style={styles.primarySmall} onPress={() => run(submission.id, () => api.put(`/api/club/admin/submissions/${submission.id}`, { status: 'approved' }), 'Demande acceptée.')}><Text style={styles.primaryText}>ACCEPTER</Text></Pressable></View></View>) : <Empty text="Aucune demande reçue." styles={styles} />}
            <Section text="FORMULAIRE PUBLIC" styles={styles} />
            <View style={styles.card}><Field label="TITRE" value={formTitle} onChangeText={setFormTitle} styles={styles} t={t} /><Primary label="CRÉER LE FORMULAIRE STANDARD" busy={busy === 'form'} onPress={() => run('form', async () => { const form = await api.post<{ id: string }>('/api/club/admin/forms', { title: formTitle, description: 'Laisse tes coordonnées, le club te recontacte.', fields: [{ key: 'discipline', label: 'Discipline souhaitée', type: 'text', required: false }, { key: 'message', label: 'Message', type: 'textarea', required: false }] }); await api.put('/api/club/admin/profile', { ...(data?.profile ?? {}), name: data?.profile?.name ?? 'Ronin Fight Team', disciplines: data?.profile?.disciplines ?? ['BJJ', 'NO-GI', 'Grappling'], joinFormId: form.id }); }, 'Formulaire public activé.')} styles={styles} /></View>
            <Section text="PAGE PUBLIQUE DU CLUB" styles={styles} />
            <View style={styles.card}><Field label="DESCRIPTION" value={profileDescription} onChangeText={setProfileDescription} multiline styles={styles} t={t} /><Field label="ADRESSE" value={profileAddress} onChangeText={setProfileAddress} styles={styles} t={t} /><Primary label="ENREGISTRER LA PAGE" busy={busy === 'profile'} onPress={() => run('profile', () => api.put('/api/club/admin/profile', { ...(data?.profile ?? {}), name: data?.profile?.name ?? 'Ronin Fight Team', description: profileDescription, address: profileAddress, disciplines: data?.profile?.disciplines ?? ['BJJ', 'NO-GI', 'Grappling'] }), 'Page publique mise à jour.')} styles={styles} /></View>
          </>}

          {tab === 'messages' && <>
            <Section text="NOUVELLE CAMPAGNE EMAIL" styles={styles} />
            <View style={styles.card}>
              <Field label="OBJET" value={campaignSubject} onChangeText={setCampaignSubject} styles={styles} t={t} />
              <Field label="MESSAGE" value={campaignBody} onChangeText={setCampaignBody} multiline styles={styles} t={t} />
              <Text style={styles.fieldLabel}>DESTINATAIRES</Text><View style={styles.pills}>{[['all', 'TOUS'], ['members', 'ÉLÈVES'], ['staff', 'STAFF']].map(([value, label]) => <Pill key={value} label={label} active={campaignAudience === value} onPress={() => setCampaignAudience(value)} styles={styles} />)}</View>
              <Primary label="ENVOYER L’EMAIL" busy={busy === 'campaign'} onPress={() => run('campaign', async () => { await api.post('/api/club/admin/campaigns', { subject: campaignSubject, body: campaignBody, audience: campaignAudience }); setCampaignSubject(''); setCampaignBody(''); }, 'Campagne envoyée.')} styles={styles} />
            </View>
            <Section text="HISTORIQUE" styles={styles} />
            {data?.campaigns.map((campaign) => <View key={campaign.id} style={styles.listRow}><View style={styles.flex}><Text style={styles.listTitle}>{campaign.subject}</Text><Text style={styles.meta}>{campaign.audience.toUpperCase()} · {campaign.sentCount} DESTINATAIRES</Text></View><Status value={campaign.status} styles={styles} /></View>)}
          </>}
          <View style={{ height: 45 }} />
        </FormScrollView>
      )}
    </View>
  );
}

function AttendanceRow({ name, subtitle, status, busy, onStatus, styles, t }: { name: string; subtitle?: string; status: string; busy: boolean; onStatus: (status: string) => void; styles: ReturnType<typeof makeStyles>; t: Theme }) {
  return <View style={styles.listRow}><View style={styles.flex}><Text style={styles.listTitle}>{name || 'Membre'}</Text><Text style={styles.meta}>{subtitle ?? status.toUpperCase()}</Text></View>{busy ? <ActivityIndicator color={t.crimson} /> : <View style={styles.attendanceActions}><Pressable style={[styles.attendanceButton, status === 'attended' && styles.present]} onPress={() => onStatus('attended')}><Ionicons name="checkmark" size={18} color={status === 'attended' ? '#FFF' : '#4A8F6D'} /></Pressable><Pressable style={[styles.attendanceButton, status === 'absent' && styles.absent]} onPress={() => onStatus('absent')}><Ionicons name="close" size={18} color={status === 'absent' ? '#FFF' : t.crimson} /></Pressable></View>}</View>;
}

function Field({ label, styles, t, multiline, ...props }: { label: string; styles: ReturnType<typeof makeStyles>; t: Theme; multiline?: boolean } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor={t.textMute} style={[styles.input, multiline && styles.textarea]} /></View>; }
function Primary({ label, busy, onPress, styles }: { label: string; busy: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles> }) { return <Pressable style={styles.primary} onPress={onPress} disabled={busy}>{busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{label}</Text>}</Pressable>; }
function Pill({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles> }) { return <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}><Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text></Pressable>; }
function Section({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) { return <Text style={styles.section}>{text}</Text>; }
function Status({ value, styles }: { value: string; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.status}><Text style={styles.statusText}>{value.toUpperCase()}</Text></View>; }
function Empty({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.empty}><Text style={styles.muted}>{text}</Text></View>; }
function Metrics({ values, styles }: { values: [string, string][]; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.metrics}>{values.map(([value, label]) => <View key={label} style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>; }

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.ink },
    header: { minHeight: 72, paddingHorizontal: 18, flexDirection: 'row', gap: 12, alignItems: 'center' },
    back: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
    preview: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: t.crimson, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1, minWidth: 0 }, eyebrow: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1.6 },
    title: { color: t.bone, fontFamily: FONTS.display, fontSize: 24, fontWeight: '900', letterSpacing: 0.8 },
    tabs: { paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: t.hairline },
    tab: { paddingHorizontal: 13, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: t.crimson },
    tabText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.9 }, tabTextActive: { color: t.bone, fontWeight: '800' },
    content: { padding: 18 }, notice: { color: '#6EB38C', padding: 11, borderWidth: 1, borderColor: '#4A8F6D55', backgroundColor: '#4A8F6D12', marginBottom: 10 }, error: { color: t.crimson, borderColor: t.crimson + '55', backgroundColor: t.crimson + '12' },
    metrics: { flexDirection: 'row', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline }, metric: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: t.hairline }, metricValue: { color: t.bone, fontFamily: FONTS.display, fontSize: 18, fontWeight: '900' }, metricLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 6.5, marginTop: 4, textAlign: 'center' },
    section: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.7, marginTop: 20, marginBottom: 8 },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, padding: 14, marginBottom: 9 }, field: { marginBottom: 12 }, fieldLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1.3, marginBottom: 6 },
    input: { minHeight: 48, color: t.bone, fontSize: 14, borderWidth: 1, borderColor: t.hairlineStrong, paddingHorizontal: 12, backgroundColor: t.ink }, textarea: { minHeight: 115, paddingTop: 12, textAlignVertical: 'top' }, twoCols: { flexDirection: 'row', gap: 10 },
    primary: { minHeight: 48, backgroundColor: t.crimson, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 3 }, primaryText: { color: '#FFF', fontFamily: FONTS.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
    secondary: { minHeight: 46, borderWidth: 1, borderColor: t.crimson, alignItems: 'center', justifyContent: 'center', marginTop: 9 }, secondaryText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    listRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.hairline }, listTitle: { color: t.bone, fontSize: 13, fontWeight: '800' }, meta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, marginTop: 4, letterSpacing: 0.5 },
    dateSquare: { width: 42, alignItems: 'center' }, dateDay: { color: t.bone, fontFamily: FONTS.display, fontSize: 20, fontWeight: '900' }, dateMonth: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 7 },
    smallAction: { borderWidth: 1, borderColor: t.crimson, paddingHorizontal: 9, paddingVertical: 7 }, smallActionText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 7, fontWeight: '800' },
    status: { borderWidth: 1, borderColor: '#4A8F6D77', paddingHorizontal: 6, paddingVertical: 3 }, statusText: { color: '#6EB38C', fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.7 },
    chips: { gap: 7, paddingBottom: 8 }, chip: { minWidth: 130, padding: 10, borderWidth: 1, borderColor: t.hairlineStrong, backgroundColor: t.surface }, chipActive: { borderColor: t.crimson }, chipText: { color: t.bone, fontFamily: FONTS.mono, fontSize: 8 }, chipSub: { color: t.textMute, fontSize: 10, marginTop: 4 }, chipTextActive: { color: t.crimson },
    attendanceActions: { flexDirection: 'row', gap: 6 }, attendanceButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.hairlineStrong }, present: { backgroundColor: '#4A8F6D', borderColor: '#4A8F6D' }, absent: { backgroundColor: t.crimson, borderColor: t.crimson },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }, pill: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: t.hairlineStrong }, pillActive: { borderColor: t.crimson, backgroundColor: t.crimson + '15' }, pillText: { color: t.textMute, fontSize: 10 }, pillTextActive: { color: t.crimson, fontWeight: '700' },
    right: { alignItems: 'flex-end' }, amount: { color: t.bone, fontWeight: '900', fontSize: 14 }, link: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 6.5, marginTop: 6 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, secondarySmall: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.crimson }, primarySmall: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson },
    empty: { padding: 26, alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline }, muted: { color: t.textMute, fontSize: 12 },
  });
}
