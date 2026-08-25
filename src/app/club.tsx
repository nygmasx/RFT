import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { DetailHeader, IconButton } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { ClassSession, useClubOverview } from '@/hooks/useClubManagement';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';

type Tab = 'planning' | 'adhesion' | 'documents' | 'famille';

const TAB_LABELS: Record<Tab, string> = {
  planning: 'PLANNING', adhesion: 'ADHÉSION', documents: 'DOCUMENTS', famille: 'FAMILLE',
};

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
}

function money(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

export default function ClubScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { data, loading, error, refetch } = useClubOverview();
  const [tab, setTab] = useState<Tab>('planning');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [familyFirstName, setFamilyFirstName] = useState('');
  const [familyLastName, setFamilyLastName] = useState('');
  const [familyBirthDate, setFamilyBirthDate] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentCategory, setDocumentCategory] = useState('medical');

  const refresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };

  const bookingFor = (session: ClassSession, familyProfileId?: string) => session.bookings.find((booking) => (
    familyProfileId ? booking.familyProfileId === familyProfileId : booking.userId !== null
  ));

  const toggleBooking = async (session: ClassSession, familyProfileId?: string) => {
    const booking = bookingFor(session, familyProfileId);
    const key = `${session.id}:${familyProfileId ?? 'me'}`;
    setBusy(key); setNotice('');
    try {
      if (booking && booking.status !== 'cancelled') {
        await api.delete(`/api/club/sessions/${session.id}/book${familyProfileId ? `?familyProfileId=${familyProfileId}` : ''}`);
      } else {
        await api.post(`/api/club/sessions/${session.id}/book`, familyProfileId ? { familyProfileId } : {});
      }
      await refetch();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Action impossible');
    } finally {
      setBusy('');
    }
  };

  const addFamilyProfile = async () => {
    if (!familyFirstName.trim() || !familyLastName.trim()) return setNotice('Prénom et nom sont obligatoires.');
    setBusy('family'); setNotice('');
    try {
      await api.post('/api/club/family', {
        firstName: familyFirstName,
        lastName: familyLastName,
        birthDate: familyBirthDate || null,
      });
      setFamilyFirstName(''); setFamilyLastName(''); setFamilyBirthDate('');
      await refetch();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Ajout impossible');
    } finally { setBusy(''); }
  };

  const uploadDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if (asset.size && asset.size > 6_000_000) return setNotice('Le document dépasse 6 Mo.');
    setBusy('document'); setNotice('');
    try {
      const base64 = await new File(asset.uri).base64();
      await api.post('/api/club/documents', {
        title: documentTitle.trim() || asset.name,
        category: documentCategory,
        fileName: asset.name,
        dataUrl: `data:${asset.mimeType ?? 'application/octet-stream'};base64,${base64}`,
      });
      setDocumentTitle('');
      await refetch();
      setNotice('Document ajouté.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Envoi impossible');
    } finally { setBusy(''); }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <DetailHeader
          eyebrow="Ronin Fight Team"
          title="MON CLUB"
          onBack={() => safeBack('/(tabs)/accueil')}
          action={<IconButton icon="globe-outline" label="Voir la page publique" onPress={() => router.push('/club-public' as never)} />}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
            <Pressable key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{TAB_LABELS[key]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      {loading ? <View style={styles.center}><ActivityIndicator color={t.crimson} /></View> : (
        <FormScrollView
          contentContainerStyle={styles.content}
          refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          {!!(error || notice) && <Text style={[styles.notice, !!error && styles.error]}>{error || notice}</Text>}

          {tab === 'planning' && <>
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statValue}>{data.attendance.attended}</Text><Text style={styles.statLabel}>PRÉSENCES</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{data.attendance.absent}</Text><Text style={styles.statLabel}>ABSENCES</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{data.sessions.length}</Text><Text style={styles.statLabel}>À VENIR</Text></View>
            </View>
            <SectionTitle text="PROCHAINS COURS" styles={styles} />
            {data.sessions.length === 0 ? <Empty text="Aucun cours programmé." styles={styles} /> : data.sessions.map((session) => (
              <View key={session.id} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.dateBlock}><Text style={styles.dateText}>{dateLabel(session.sessionDate)}</Text><Text style={styles.timeText}>{session.startTime.slice(0, 5)}{session.endTime ? ` — ${session.endTime.slice(0, 5)}` : ''}</Text></View>
                  <View style={styles.capacity}><Ionicons name="people-outline" size={13} color={t.textMute} /><Text style={styles.capacityText}>{session.bookedCount}/{session.capacity}</Text></View>
                </View>
                <Text style={styles.cardTitle}>{session.title}</Text>
                <Text style={styles.meta}>{[session.discipline, session.category, session.place].filter(Boolean).join(' · ')}</Text>
                <BookingButton
                  label="MOI"
                  booking={bookingFor(session)}
                  loading={busy === `${session.id}:me`}
                  onPress={() => toggleBooking(session)}
                  styles={styles}
                  t={t}
                />
                {data.familyProfiles.map((profile) => (
                  <BookingButton
                    key={profile.id}
                    label={`${profile.firstName} ${profile.lastName}`}
                    booking={bookingFor(session, profile.id)}
                    loading={busy === `${session.id}:${profile.id}`}
                    onPress={() => toggleBooking(session, profile.id)}
                    styles={styles}
                    t={t}
                  />
                ))}
              </View>
            ))}
          </>}

          {tab === 'adhesion' && <>
            <SectionTitle text="MON ADHÉSION" styles={styles} />
            {data.memberships.length === 0 ? <Empty text="Aucune formule active. Contacte ton coach." styles={styles} /> : data.memberships.map((membership) => (
              <View key={membership.id} style={styles.card}>
                <View style={styles.rowTop}><Text style={styles.cardTitle}>{membership.planName}</Text><Status value={membership.status} styles={styles} /></View>
                <Text style={styles.price}>{money(membership.priceCents, membership.currency)}</Text>
                <Text style={styles.meta}>DEPUIS LE {dateLabel(membership.startDate)}{membership.endDate ? ` · JUSQU’AU ${dateLabel(membership.endDate)}` : ''}</Text>
                <View style={styles.balance}><Text style={styles.balanceLabel}>SOLDE RESTANT</Text><Text style={[styles.balanceValue, membership.balanceCents > 0 && { color: t.crimson }]}>{money(membership.balanceCents, membership.currency)}</Text></View>
                {!!membership.checkoutUrl && membership.balanceCents > 0 && <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(membership.checkoutUrl!)}><Text style={styles.primaryText}>PAYER EN LIGNE →</Text></Pressable>}
              </View>
            ))}
            <SectionTitle text="HISTORIQUE DES PAIEMENTS" styles={styles} />
            {data.payments.map((payment) => <View key={payment.id} style={styles.listRow}><View><Text style={styles.listTitle}>{payment.method.toUpperCase()}</Text><Text style={styles.meta}>{new Date(payment.createdAt).toLocaleDateString('fr-FR')}</Text></View><View style={styles.alignRight}><Text style={styles.listAmount}>{money(payment.amountCents, payment.currency)}</Text><Status value={payment.status} styles={styles} /></View></View>)}
          </>}

          {tab === 'documents' && <>
            <SectionTitle text="AJOUTER UN DOCUMENT" styles={styles} />
            <View style={styles.card}>
              <TextInput value={documentTitle} onChangeText={setDocumentTitle} placeholder="Titre (facultatif)" placeholderTextColor={t.textMute} style={styles.input} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {['medical', 'license', 'insurance', 'identity', 'contract', 'other'].map((category) => <Pressable key={category} style={[styles.chip, documentCategory === category && styles.chipActive]} onPress={() => setDocumentCategory(category)}><Text style={[styles.chipText, documentCategory === category && styles.chipTextActive]}>{category.toUpperCase()}</Text></Pressable>)}
              </ScrollView>
              <Pressable style={styles.primaryButton} onPress={uploadDocument} disabled={busy === 'document'}>{busy === 'document' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>CHOISIR PDF OU PHOTO</Text>}</Pressable>
            </View>
            <SectionTitle text="MES DOCUMENTS" styles={styles} />
            {data.documents.length === 0 ? <Empty text="Aucun document." styles={styles} /> : data.documents.map((document) => <Pressable key={document.id} style={styles.listRow} onPress={() => Linking.openURL(document.url)}><View style={styles.documentIcon}><Ionicons name={document.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={20} color={t.crimson} /></View><View style={styles.flex}><Text style={styles.listTitle}>{document.title}</Text><Text style={styles.meta}>{document.category.toUpperCase()} · {document.fileName}</Text></View><Ionicons name="open-outline" size={18} color={t.textMute} /></Pressable>)}
          </>}

          {tab === 'famille' && <>
            <SectionTitle text="PROFILS RATTACHÉS" styles={styles} />
            {data.familyProfiles.map((profile) => <View key={profile.id} style={styles.listRow}><View style={styles.familyAvatar}><Text style={styles.familyInitial}>{profile.firstName[0]}{profile.lastName[0]}</Text></View><View style={styles.flex}><Text style={styles.listTitle}>{profile.firstName} {profile.lastName}</Text><Text style={styles.meta}>{[profile.category, profile.birthDate].filter(Boolean).join(' · ') || 'PROFIL FAMILLE'}</Text></View><Pressable onPress={async () => { setBusy(profile.id); await api.delete(`/api/club/family/${profile.id}`); await refetch(); setBusy(''); }}><Ionicons name="trash-outline" size={18} color={t.crimson} /></Pressable></View>)}
            <SectionTitle text="AJOUTER UN PROFIL" styles={styles} />
            <View style={styles.card}>
              <TextInput value={familyFirstName} onChangeText={setFamilyFirstName} placeholder="Prénom" placeholderTextColor={t.textMute} style={styles.input} />
              <TextInput value={familyLastName} onChangeText={setFamilyLastName} placeholder="Nom" placeholderTextColor={t.textMute} style={styles.input} />
              <TextInput value={familyBirthDate} onChangeText={setFamilyBirthDate} placeholder="Date de naissance (AAAA-MM-JJ)" placeholderTextColor={t.textMute} style={styles.input} keyboardType="numbers-and-punctuation" />
              <Pressable style={styles.primaryButton} onPress={addFamilyProfile} disabled={busy === 'family'}>{busy === 'family' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>AJOUTER LE PROFIL</Text>}</Pressable>
            </View>
          </>}
          <View style={{ height: 40 }} />
        </FormScrollView>
      )}
    </View>
  );
}

function BookingButton({ label, booking, loading, onPress, styles, t }: { label: string; booking?: { status: string }; loading: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles>; t: Theme }) {
  const active = booking && booking.status !== 'cancelled';
  return <Pressable style={[styles.bookingButton, active && styles.bookingButtonActive]} onPress={onPress} disabled={loading}>{loading ? <ActivityIndicator size="small" color={t.crimson} /> : <><Text numberOfLines={1} style={[styles.bookingLabel, active && styles.bookingLabelActive]}>{label}</Text><Text style={[styles.bookingAction, active && styles.bookingActionActive]}>{active ? (booking.status === 'waitlist' ? 'LISTE D’ATTENTE' : 'INSCRIT · ANNULER') : 'S’INSCRIRE'}</Text></>}</Pressable>;
}

function SectionTitle({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) { return <Text style={styles.sectionTitle}>{text}</Text>; }
function Empty({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>; }
function Status({ value, styles }: { value: string; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.status}><Text style={styles.statusText}>{value.toUpperCase()}</Text></View>; }

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    tabs: { paddingHorizontal: Layout.gutter, borderBottomWidth: 1, borderBottomColor: t.hairline },
    tab: { paddingHorizontal: 14, height: 45, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: t.crimson },
    tabText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1 },
    tabTextActive: { color: t.bone, fontWeight: '800' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: Layout.gutter },
    notice: { color: t.success, padding: 12, backgroundColor: t.success + '18', borderWidth: 1, borderColor: t.success + '55', borderRadius: Radii.md, marginBottom: 10, fontSize: 12 },
    error: { color: t.crimson, backgroundColor: t.crimson + '12', borderColor: t.crimson + '55' },
    stats: { flexDirection: 'row', borderWidth: 1, borderColor: t.hairline, backgroundColor: t.surface, borderRadius: Radii.lg, overflow: 'hidden' },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRightWidth: 1, borderRightColor: t.hairline },
    statValue: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', fontSize: 24 },
    statLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, marginTop: 3, letterSpacing: 1 },
    sectionTitle: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.7, marginTop: 20, marginBottom: 8 },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, padding: 16, marginBottom: 10, borderRadius: Radii.lg },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    dateBlock: { flex: 1 },
    dateText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    timeText: { color: t.textDim, fontSize: 11, marginTop: 2 },
    capacity: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    capacityText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9 },
    cardTitle: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', fontSize: 17, marginTop: 9 },
    meta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.6, marginTop: 4 },
    bookingButton: { minHeight: Layout.touchTarget, marginTop: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bookingButtonActive: { borderColor: t.success + '88', backgroundColor: t.success + '0D' },
    bookingLabel: { color: t.bone, fontSize: 11, fontWeight: '700', flex: 1 },
    bookingLabelActive: { color: t.success },
    bookingAction: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.7 },
    bookingActionActive: { color: t.success },
    price: { color: t.crimson, fontFamily: FONTS.display, fontSize: 28, fontWeight: '900', marginTop: 10 },
    balance: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.hairline, flexDirection: 'row', justifyContent: 'space-between' },
    balanceLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8 },
    balanceValue: { color: t.bone, fontWeight: '800' },
    primaryButton: { minHeight: 48, marginTop: 12, backgroundColor: t.crimson, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
    primaryText: { color: t.onAccent, fontFamily: FONTS.display, fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
    status: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: Radii.round, borderWidth: 1, borderColor: t.success + '88' },
    statusText: { color: t.success, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 0.8 },
    listRow: { minHeight: 66, padding: 12, backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.hairline, flexDirection: 'row', alignItems: 'center', gap: 11 },
    listTitle: { color: t.bone, fontWeight: '800', fontSize: 13 },
    listAmount: { color: t.bone, fontWeight: '900', fontSize: 14, marginBottom: 4 },
    alignRight: { alignItems: 'flex-end' },
    documentIcon: { width: 40, height: 40, borderRadius: Radii.round, alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated },
    familyAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated },
    familyInitial: { color: t.bone, fontWeight: '900', fontSize: 12 },
    flex: { flex: 1, minWidth: 0 },
    input: { minHeight: 50, color: t.bone, borderBottomWidth: 1, borderBottomColor: t.hairlineStrong, fontSize: 14, paddingHorizontal: 4 },
    chips: { gap: 6, paddingVertical: 12 },
    chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radii.round, borderWidth: 1, borderColor: t.hairlineStrong },
    chipActive: { borderColor: t.crimson, backgroundColor: t.crimson + '15' },
    chipText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7 },
    chipTextActive: { color: t.crimson },
    empty: { padding: 24, alignItems: 'center', borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, backgroundColor: t.surface },
    emptyText: { color: t.textMute, fontSize: 12, textAlign: 'center' },
  });
}
