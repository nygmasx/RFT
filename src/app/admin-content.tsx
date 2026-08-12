import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Announcement, Competition } from '@/lib/database.types';
import { api } from '@/lib/api';

type Section = 'announcements' | 'competitions';

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
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [compType, setCompType] = useState('GI');
  const [status, setStatus] = useState('open');

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
    setName(''); setDate(''); setLocation(''); setDeadline(''); setCompType('GI'); setStatus('open');
  };

  const editAnnouncement = (item: Announcement) => {
    setSection('announcements'); setEditingId(item.id); setTitle(item.title); setBody(item.body);
    setTag(item.tag ?? 'INFO'); setPinned(item.pinned);
  };
  const editCompetition = (item: Competition) => {
    setSection('competitions'); setEditingId(item.id); setName(item.name); setDate(item.comp_date);
    setLocation(item.location ?? ''); setDeadline(item.registration_deadline ?? '');
    setCompType(item.comp_type ?? 'GI'); setStatus(item.status);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (section === 'announcements') {
        const payload = { title, body, tag, pinned };
        if (editingId) await api.put(`/api/announcements/${editingId}`, payload);
        else await api.post('/api/announcements', payload);
      } else {
        const payload = { name, comp_date: date, location, registration_deadline: deadline || null, comp_type: compType, status };
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
      <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.title}>CONTENU DU CLUB</Text><Text style={styles.muted}>Annonces et compétitions</Text></View>
      </View>
      <View style={styles.tabs}>{(['announcements', 'competitions'] as Section[]).map((key) => <Pressable key={key}
        style={[styles.tab, section === key && styles.tabActive]} onPress={() => { setSection(key); reset(); }}>
        <Text style={[styles.tabText, section === key && styles.tabTextActive]}>{key === 'announcements' ? 'ANNONCES' : 'COMPÉTITIONS'}</Text>
      </Pressable>)}</View>
    </SafeAreaView>
    {loading ? <View style={styles.center}><ActivityIndicator color={t.crimson} /></View> : <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId ? 'MODIFIER' : 'NOUVEAU'}</Text>
        {section === 'announcements' ? <>
          <TextInput style={styles.input} placeholder="Titre" placeholderTextColor={t.textMute} value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.multiline]} placeholder="Message" placeholderTextColor={t.textMute} value={body} onChangeText={setBody} multiline />
          <TextInput style={styles.input} placeholder="Tag (INFO, IMPORTANT…)" placeholderTextColor={t.textMute} value={tag} onChangeText={setTag} />
          <View style={styles.switchRow}><Text style={styles.label}>ÉPINGLER</Text><Switch value={pinned} onValueChange={setPinned} trackColor={{ true: t.crimson }} /></View>
        </> : <>
          <TextInput style={styles.input} placeholder="Nom" placeholderTextColor={t.textMute} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Date AAAA-MM-JJ" placeholderTextColor={t.textMute} value={date} onChangeText={setDate} />
          <TextInput style={styles.input} placeholder="Lieu" placeholderTextColor={t.textMute} value={location} onChangeText={setLocation} />
          <TextInput style={styles.input} placeholder="Clôture AAAA-MM-JJ (facultatif)" placeholderTextColor={t.textMute} value={deadline} onChangeText={setDeadline} />
          <View style={styles.choiceRow}>{['GI', 'NO-GI', 'OPEN'].map((value) => <Pressable key={value} onPress={() => setCompType(value)} style={[styles.choice, compType === value && styles.choiceActive]}><Text style={styles.choiceText}>{value}</Text></Pressable>)}</View>
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
    </ScrollView>}
  </View>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.ink }, center: { flex: 1, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }, back: { color: t.bone, fontSize: 32 },
  title: { color: t.bone, fontFamily: FONTS.display, fontSize: 20, fontWeight: '900', letterSpacing: 1.5 }, muted: { color: t.textMute, fontSize: 11.5, marginTop: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, paddingBottom: 12 }, tab: { flex: 1, borderWidth: 1, borderColor: t.hairlineStrong, padding: 10, alignItems: 'center' }, tabActive: { backgroundColor: t.crimson, borderColor: t.crimson },
  tabText: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 }, tabTextActive: { color: '#fff' }, scroll: { padding: 20, gap: 10 },
  form: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, padding: 14, gap: 10, marginBottom: 10 }, formTitle: { color: t.bone, fontFamily: FONTS.display, fontWeight: '900', letterSpacing: 1 },
  input: { color: t.bone, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong, padding: 12, borderRadius: 3 }, multiline: { minHeight: 90, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, label: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 10 }, choiceRow: { flexDirection: 'row', gap: 6 },
  choice: { flex: 1, borderWidth: 1, borderColor: t.hairlineStrong, padding: 8, alignItems: 'center' }, choiceActive: { backgroundColor: t.crimson }, choiceText: { color: t.bone, fontSize: 10 },
  actions: { flexDirection: 'row', gap: 8 }, save: { flex: 1, backgroundColor: t.crimson, padding: 13, alignItems: 'center' }, saveText: { color: '#fff', fontWeight: '900', letterSpacing: 1 }, cancel: { padding: 13, borderWidth: 1, borderColor: t.hairlineStrong }, cancelText: { color: t.textDim },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline }, cardTitle: { color: t.bone, fontWeight: '700', fontSize: 14 }, delete: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9 },
});
