import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { DateTimeField } from '@/components/date-time-field';
import { DetailHeader } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { AddressAutocomplete, AddressSuggestion } from '@/components/address-autocomplete';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Announcement, Competition } from '@/lib/database.types';
import { api } from '@/lib/api';

type Section = 'announcements' | 'competitions';

const pad = (value: number) => String(value).padStart(2, '0');
const apiDate = (value: Date | null) => value ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` : null;
const parseDate = (value: string | null) => value ? new Date(`${value}T12:00:00`) : null;

export default function AdminContentScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [section, setSection] = useState<Section>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('INFO');
  const [pinned, setPinned] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [location, setLocation] = useState('');
  const [locationPoint, setLocationPoint] = useState<AddressSuggestion | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [compType, setCompType] = useState('GI');
  const [status, setStatus] = useState('open');
  const [importance, setImportance] = useState<Competition['importance']>('regional');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [announcementRows, competitionRows] = await Promise.all([
        api.get<Announcement[]>('/api/announcements'),
        api.get<Competition[]>('/api/competitions/all'),
      ]);
      setAnnouncements(announcementRows ?? []);
      setCompetitions(competitionRows ?? []);
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const reset = () => {
    setEditingId(null); setTitle(''); setBody(''); setTag('INFO'); setPinned(false);
    setName(''); setDate(new Date()); setLocation(''); setLocationPoint(null); setDeadline(null); setRegistrationUrl(''); setCompType('GI'); setStatus('open'); setImportance('regional');
  };

  const editAnnouncement = (item: Announcement) => {
    setSection('announcements'); setEditingId(item.id); setTitle(item.title); setBody(item.body);
    setTag(item.tag ?? 'INFO'); setPinned(item.pinned);
  };
  const editCompetition = (item: Competition) => {
    setSection('competitions'); setEditingId(item.id); setName(item.name); setDate(parseDate(item.comp_date) ?? new Date());
    setLocation(item.location ?? ''); setDeadline(parseDate(item.registration_deadline));
    setRegistrationUrl(item.registration_url ?? '');
    setLocationPoint(item.latitude != null && item.longitude != null ? {
      label: item.location ?? '', latitude: item.latitude, longitude: item.longitude,
    } : null);
    setCompType(item.comp_type ?? 'GI'); setStatus(item.status); setImportance(item.importance ?? 'regional');
  };

  const save = async () => {
    if (section === 'competitions' && location.trim() && !locationPoint) {
      Alert.alert('Adresse incomplète', 'Sélectionne l’adresse de la compétition dans la liste proposée.');
      return;
    }
    setSaving(true);
    try {
      if (section === 'announcements') {
        const payload = { title, body, tag, pinned };
        if (editingId) await api.put(`/api/announcements/${editingId}`, payload);
        else await api.post('/api/announcements', payload);
      } else {
        const payload = {
          name, comp_date: apiDate(date), location, registration_deadline: apiDate(deadline), registration_url: registrationUrl.trim() || null, comp_type: compType, status, importance,
          latitude: locationPoint?.latitude ?? null, longitude: locationPoint?.longitude ?? null,
        };
        if (editingId) await api.put(`/api/competitions/${editingId}`, payload);
        else await api.post('/api/competitions', payload);
      }
      reset(); await load();
    } catch (error: any) { Alert.alert('Enregistrement impossible', error.message); }
    finally { setSaving(false); }
  };

  const remove = (id: string) => Alert.alert('Confirmer la suppression', 'Cette action est définitive.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      await api.delete(`/api/${section}/${id}`); reset(); await load();
    } },
  ]);

  if (user?.role !== 'coach' && user?.role !== 'admin') return <View style={styles.center}><Text style={styles.muted}>Accès réservé.</Text></View>;

  return <View style={styles.container}>
    <SafeAreaView edges={['top']}>
      <DetailHeader eyebrow="Annonces & compétitions" title="CONTENU DU CLUB" onBack={() => router.back()} />
      <View style={styles.tabs}>{(['announcements', 'competitions'] as Section[]).map((key) => <Pressable key={key}
        style={[styles.tab, section === key && styles.tabActive]} onPress={() => { setSection(key); reset(); }}>
        <Text style={[styles.tabText, section === key && styles.tabTextActive]}>{key === 'announcements' ? 'ANNONCES' : 'COMPÉTITIONS'}</Text>
      </Pressable>)}</View>
    </SafeAreaView>
    {loading ? <View style={styles.center}><ActivityIndicator color={t.crimson} /></View> : <FormScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId ? 'MODIFIER' : 'NOUVEAU'}</Text>
        {section === 'announcements' ? <>
          <TextInput style={styles.input} placeholder="Titre" placeholderTextColor={t.textMute} value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.multiline]} placeholder="Message" placeholderTextColor={t.textMute} value={body} onChangeText={setBody} multiline />
          <TextInput style={styles.input} placeholder="Tag (INFO, IMPORTANT…)" placeholderTextColor={t.textMute} value={tag} onChangeText={setTag} />
          <View style={styles.switchRow}><Text style={styles.label}>ÉPINGLER</Text><Switch value={pinned} onValueChange={setPinned} trackColor={{ true: t.crimson }} /></View>
        </> : <>
          <TextInput style={styles.input} placeholder="Nom" placeholderTextColor={t.textMute} value={name} onChangeText={setName} />
          <DateTimeField label="DATE DE LA COMPÉTITION" mode="date" value={date} onChange={(value) => value && setDate(value)} />
          <AddressAutocomplete
            placeholder="Adresse complète du lieu"
            value={location}
            onChange={(value) => { setLocation(value); setLocationPoint(null); }}
            onSelect={(suggestion) => { setLocation(suggestion.label); setLocationPoint(suggestion); }}
          />
          <DateTimeField label="CLÔTURE DES INSCRIPTIONS" mode="date" value={deadline} onChange={setDeadline} optional maximumDate={date} />
          <TextInput style={styles.input} placeholder="Lien d’inscription https://…" placeholderTextColor={t.textMute} value={registrationUrl} onChangeText={setRegistrationUrl} autoCapitalize="none" keyboardType="url" />
          <View style={styles.choiceRow}>{['GI', 'NO-GI', 'OPEN'].map((value) => <Pressable key={value} onPress={() => setCompType(value)} style={[styles.choice, compType === value && styles.choiceActive]}><Text style={styles.choiceText}>{value}</Text></Pressable>)}</View>
          <Text style={styles.label}>IMPORTANCE POUR LE CLASSEMENT</Text>
          <View style={styles.choiceWrap}>{([
            ['local', 'LOCAL'], ['regional', 'RÉGIONAL'], ['national', 'NATIONAL'], ['international', 'INTERNAT.'], ['major', 'MAJEUR'],
          ] as [Competition['importance'], string][]).map(([value, label]) => <Pressable key={value} onPress={() => setImportance(value)} style={[styles.choiceCompact, importance === value && styles.choiceActive]}><Text style={styles.choiceText}>{label}</Text></Pressable>)}</View>
          <View style={styles.choiceRow}>{['open', 'soon', 'closed'].map((value) => <Pressable key={value} onPress={() => setStatus(value)} style={[styles.choice, status === value && styles.choiceActive]}><Text style={styles.choiceText}>{value.toUpperCase()}</Text></Pressable>)}</View>
        </>}
        <View style={styles.actions}><Pressable style={styles.save} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>ENREGISTRER</Text>}</Pressable>{editingId && <Pressable style={styles.cancel} onPress={reset}><Text style={styles.cancelText}>ANNULER</Text></Pressable>}</View>
      </View>
      {(section === 'announcements' ? announcements : competitions).map((item) => <View key={item.id} style={styles.card}>
        <Pressable style={{ flex: 1 }} onPress={() => section === 'announcements' ? editAnnouncement(item as Announcement) : editCompetition(item as Competition)}>
          <Text style={styles.cardTitle}>{section === 'announcements' ? (item as Announcement).title : (item as Competition).name}</Text>
          <Text style={styles.muted}>{section === 'announcements' ? (item as Announcement).tag : `${(item as Competition).comp_date} · ${(item as Competition).location ?? 'Lieu à préciser'}`}</Text>
        </Pressable>
        <Pressable onPress={() => remove(item.id)}><Text style={styles.delete}>SUPPR.</Text></Pressable>
      </View>)}
    </FormScrollView>}
  </View>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink }, center: { flex: 1, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' },
  muted: { color: t.textMute, fontSize: 11.5, marginTop: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: Layout.gutter, gap: 8, paddingBottom: 12 }, tab: { flex: 1, minHeight: Layout.touchTarget, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md, padding: 10, alignItems: 'center', justifyContent: 'center' }, tabActive: { backgroundColor: t.crimson, borderColor: t.crimson },
  tabText: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 }, tabTextActive: { color: t.onAccent }, scroll: { padding: Layout.gutter, gap: 10 },
  form: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.lg, padding: 16, gap: 10, marginBottom: 10 }, formTitle: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', letterSpacing: 1 },
  input: { minHeight: 48, color: t.bone, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong, padding: 12, borderRadius: Radii.md }, multiline: { minHeight: 90, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, label: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 10 }, choiceRow: { flexDirection: 'row', gap: 6 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, choiceCompact: { minWidth: '30%', flexGrow: 1, borderWidth: 1, borderColor: t.hairlineStrong, padding: 8, alignItems: 'center' },
  choice: { flex: 1, borderWidth: 1, borderColor: t.hairlineStrong, padding: 8, alignItems: 'center' }, choiceActive: { backgroundColor: t.crimson }, choiceText: { color: t.bone, fontSize: 10 },
  actions: { flexDirection: 'row', gap: 8 }, save: { flex: 1, minHeight: Layout.touchTarget, backgroundColor: t.crimson, borderRadius: Radii.md, padding: 13, alignItems: 'center', justifyContent: 'center' }, saveText: { color: t.onAccent, fontWeight: '900', letterSpacing: 1 }, cancel: { minHeight: Layout.touchTarget, justifyContent: 'center', padding: 13, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md }, cancelText: { color: t.textDim },
  card: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.md }, cardTitle: { color: t.bone, fontWeight: '700', fontSize: 14 }, delete: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9 },
});
