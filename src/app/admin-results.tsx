import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';

type Filter = 'all' | 'registered' | 'results';
type ResultType = 'GI' | 'NO-GI';

type CompetitionOverview = {
  id: string;
  name: string;
  location: string | null;
  comp_date: string;
  comp_type: string | null;
  status: string;
  registered_count: number;
  result_count: number;
};

type ManagedRegistration = {
  id: string;
  status: string;
  weightClass: string | null;
  createdAt: string;
};

type ManagedResult = {
  id: string;
  place: number;
  weightClass: string | null;
  compType: ResultType | null;
  notes: string | null;
};

type ManagedMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  category: string | null;
  weightClass: string | null;
  registration: ManagedRegistration | null;
  result: ManagedResult | null;
};

type CompetitionManagement = {
  competition: CompetitionOverview;
  members: ManagedMember[];
};

const WEIGHT_OPTIONS = ['-55 kg', '-60 kg', '-65 kg', '-70 kg', '-76 kg', '-82 kg', '-88 kg', '-94 kg', '+94 kg'];
const PLACE_OPTIONS = [1, 2, 3, 4];

function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function placeLabel(place: number) {
  if (place === 1) return '1ER';
  if (place === 4) return 'TOP 4+';
  return `${place}E`;
}

export default function AdminResultsScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const { competitionId } = useLocalSearchParams<{ competitionId?: string }>();
  const styles = useMemo(() => makeStyles(t), [t]);
  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  const [competitions, setCompetitions] = useState<CompetitionOverview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [management, setManagement] = useState<CompetitionManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editorMember, setEditorMember] = useState<ManagedMember | null>(null);
  const [place, setPlace] = useState(1);
  const [compType, setCompType] = useState<ResultType>('GI');
  const [weightClass, setWeightClass] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadManagement = useCallback(async (id: string) => {
    const data = await api.get<CompetitionManagement>(`/api/competitions/${id}/admin`);
    setManagement(data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<CompetitionOverview[]>('/api/competitions/admin/overview');
      setCompetitions(rows);
      const requested = competitionId && rows.some(({ id }) => id === competitionId) ? competitionId : null;
      const nextId = requested ?? (selectedId && rows.some(({ id }) => id === selectedId) ? selectedId : rows[0]?.id);
      setSelectedId(nextId ?? null);
      if (nextId) await loadManagement(nextId);
      else setManagement(null);
    } catch (error: any) {
      Alert.alert('Chargement impossible', error.message);
    } finally {
      setLoading(false);
    }
  }, [competitionId, loadManagement, selectedId]);

  useFocusEffect(useCallback(() => {
    void load();
  // selectedId is intentionally excluded: changing competition has its own focused request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId, loadManagement]));

  const selectCompetition = async (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
    setManagement(null);
    setLoading(true);
    try {
      await loadManagement(id);
    } catch (error: any) {
      Alert.alert('Chargement impossible', error.message);
    } finally {
      setLoading(false);
    }
  };

  const reloadSelected = useCallback(async () => {
    if (!selectedId) return;
    const [overview] = await Promise.all([
      api.get<CompetitionOverview[]>('/api/competitions/admin/overview'),
      loadManagement(selectedId),
    ]);
    setCompetitions(overview);
  }, [loadManagement, selectedId]);

  const refresh = async () => {
    setRefreshing(true);
    try { await reloadSelected(); }
    catch (error: any) { Alert.alert('Actualisation impossible', error.message); }
    finally { setRefreshing(false); }
  };

  const enroll = async (member: ManagedMember) => {
    if (!selectedId) return;
    setActionId(member.id);
    try {
      await api.put(`/api/competitions/${selectedId}/admin/registrations/${member.id}`, {
        weight_class: member.result?.weightClass ?? member.weightClass,
      });
      await reloadSelected();
    } catch (error: any) {
      Alert.alert('Inscription impossible', error.message);
    } finally {
      setActionId(null);
    }
  };

  const removeRegistration = (member: ManagedMember) => {
    if (!selectedId) return;
    Alert.alert(
      'Retirer cette inscription ?',
      `Le résultat de ${member.firstName}, s’il existe, sera conservé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer', style: 'destructive', onPress: async () => {
            setActionId(member.id);
            try {
              await api.delete(`/api/competitions/${selectedId}/admin/registrations/${member.id}`);
              await reloadSelected();
            } catch (error: any) {
              Alert.alert('Retrait impossible', error.message);
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const openEditor = (member: ManagedMember) => {
    setEditorMember(member);
    setPlace(member.result?.place ?? 1);
    setCompType(member.result?.compType ?? (management?.competition.comp_type === 'NO-GI' ? 'NO-GI' : 'GI'));
    setWeightClass(member.result?.weightClass ?? member.registration?.weightClass ?? member.weightClass ?? '');
    setNotes(member.result?.notes ?? '');
  };

  const saveResult = async () => {
    if (!selectedId || !editorMember) return;
    setSaving(true);
    try {
      await api.put(`/api/palmares/admin/competition/${selectedId}/user/${editorMember.id}`, {
        place,
        comp_type: compType,
        weight_class: weightClass || null,
        notes: notes || null,
      });
      setEditorMember(null);
      await reloadSelected();
    } catch (error: any) {
      Alert.alert('Résultat impossible à enregistrer', error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteResult = () => {
    if (!selectedId || !editorMember?.result) return;
    Alert.alert('Supprimer ce résultat ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          setSaving(true);
          try {
            await api.delete(`/api/palmares/admin/competition/${selectedId}/user/${editorMember.id}`);
            setEditorMember(null);
            await reloadSelected();
          } catch (error: any) {
            Alert.alert('Suppression impossible', error.message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const visibleMembers = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    return (management?.members ?? []).filter((member) => {
      const matchesSearch = !needle || `${member.firstName} ${member.lastName}`.toLocaleLowerCase('fr').includes(needle);
      const matchesFilter = filter === 'all' || (filter === 'registered' ? Boolean(member.registration) : Boolean(member.result));
      return matchesSearch && matchesFilter;
    });
  }, [filter, management?.members, search]);

  if (!isCoach) {
    return <View style={[styles.container, styles.center]}><Text style={styles.muted}>Accès réservé aux coachs.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/admin')} style={styles.back}><Text style={styles.backIcon}>‹</Text></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>RÉSULTATS</Text>
            <Text style={styles.subtitle}>Inscriptions & palmarès des élèves</Text>
          </View>
          <View style={styles.headerIcon}><Ionicons name="trophy" size={18} color={t.crimson} /></View>
        </View>
      </SafeAreaView>

      {loading && !management ? (
        <View style={styles.center}><ActivityIndicator color={t.crimson} size="large" /></View>
      ) : competitions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={34} color={t.textMute} />
          <Text style={styles.emptyTitle}>AUCUNE COMPÉTITION</Text>
          <Text style={styles.emptyText}>Crée d’abord une compétition depuis la gestion du contenu.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/admin-content' as never)}><Text style={styles.primaryButtonText}>CRÉER UNE COMPÉTITION</Text></Pressable>
        </View>
      ) : (
        <FormScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.crimson} />}
        >
          <Text style={styles.eyebrow}>COMPÉTITION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.competitionList}>
            {competitions.map((competition) => {
              const active = competition.id === selectedId;
              return (
                <Pressable key={competition.id} style={[styles.competitionCard, active && styles.competitionCardActive]} onPress={() => void selectCompetition(competition.id)}>
                  <Text style={[styles.competitionDate, active && styles.accent]}>{formatDate(competition.comp_date).toLocaleUpperCase('fr')}</Text>
                  <Text numberOfLines={2} style={styles.competitionName}>{competition.name}</Text>
                  <Text numberOfLines={1} style={styles.competitionLocation}>{competition.location || 'Lieu non renseigné'}</Text>
                  <View style={styles.countRow}>
                    <Text style={styles.count}>{competition.registered_count} INSCRIT{competition.registered_count > 1 ? 'S' : ''}</Text>
                    <Text style={styles.count}>{competition.result_count} RÉSULTAT{competition.result_count > 1 ? 'S' : ''}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {management && (
            <>
              <View style={styles.summary}>
                <View><Text style={styles.summaryValue}>{management.members.length}</Text><Text style={styles.summaryLabel}>ÉLÈVES</Text></View>
                <View style={styles.summaryDivider} />
                <View><Text style={styles.summaryValue}>{management.members.filter(({ registration }) => registration).length}</Text><Text style={styles.summaryLabel}>INSCRITS</Text></View>
                <View style={styles.summaryDivider} />
                <View><Text style={styles.summaryValue}>{management.members.filter(({ result }) => result).length}</Text><Text style={styles.summaryLabel}>RÉSULTATS</Text></View>
              </View>

              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={t.textMute} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Rechercher un élève"
                  placeholderTextColor={t.textMute}
                  autoCapitalize="words"
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={t.textMute} /></Pressable> : null}
              </View>

              <View style={styles.filters}>
                {([['all', 'TOUS'], ['registered', 'INSCRITS'], ['results', 'RÉSULTATS']] as [Filter, string][]).map(([key, label]) => (
                  <Pressable key={key} style={[styles.filter, filter === key && styles.filterActive]} onPress={() => setFilter(key)}>
                    <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.members}>
                {visibleMembers.map((member) => {
                  const busy = actionId === member.id;
                  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
                  return (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={styles.memberTop}>
                        {member.avatarUrl
                          ? <Image source={{ uri: member.avatarUrl }} style={styles.avatar} contentFit="cover" />
                          : <View style={styles.avatarFallback}><Text style={styles.initials}>{initials}</Text></View>}
                        <View style={styles.memberIdentity}>
                          <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
                          <Text style={styles.memberMeta}>{[member.category, member.weightClass].filter(Boolean).join(' · ') || 'Catégorie non renseignée'}</Text>
                        </View>
                        {member.result ? (
                          <View style={styles.medal}><Text style={styles.medalPlace}>{placeLabel(member.result.place)}</Text><Text style={styles.medalLabel}>PLACE</Text></View>
                        ) : null}
                      </View>

                      <View style={styles.statusRow}>
                        <View style={[styles.statusPill, member.registration && styles.statusPillActive]}>
                          <Ionicons name={member.registration ? 'checkmark-circle' : 'remove-circle-outline'} size={14} color={member.registration ? t.crimson : t.textMute} />
                          <Text style={[styles.statusText, member.registration && styles.statusTextActive]}>{member.registration ? `INSCRIT · ${member.registration.status.toLocaleUpperCase('fr')}` : 'NON INSCRIT'}</Text>
                        </View>
                        {member.result ? <Text style={styles.resultMeta}>{[member.result.compType, member.result.weightClass].filter(Boolean).join(' · ')}</Text> : null}
                      </View>

                      <View style={styles.actions}>
                        <Pressable disabled={busy} style={[styles.secondaryButton, member.registration && styles.dangerButton]} onPress={() => member.registration ? removeRegistration(member) : void enroll(member)}>
                          {busy ? <ActivityIndicator size="small" color={t.crimson} /> : <Text style={[styles.secondaryButtonText, member.registration && styles.dangerButtonText]}>{member.registration ? 'RETIRER' : 'INSCRIRE'}</Text>}
                        </Pressable>
                        <Pressable style={styles.resultButton} onPress={() => openEditor(member)}>
                          <Ionicons name={member.result ? 'create-outline' : 'add'} size={17} color="#FFF" />
                          <Text style={styles.resultButtonText}>{member.result ? 'MODIFIER' : 'RÉSULTAT'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {visibleMembers.length === 0 ? <Text style={styles.noMembers}>Aucun élève ne correspond à ce filtre.</Text> : null}
              </View>
            </>
          )}
        </FormScrollView>
      )}

      <Modal visible={Boolean(editorMember)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditorMember(null)}>
        <View style={styles.modal}>
          <SafeAreaView edges={['top']}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditorMember(null)}><Text style={styles.modalCancel}>ANNULER</Text></Pressable>
              <Text style={styles.modalTitle}>{editorMember?.result ? 'MODIFIER LE RÉSULTAT' : 'AJOUTER UN RÉSULTAT'}</Text>
              <View style={{ width: 62 }} />
            </View>
          </SafeAreaView>
          <FormScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.editorIdentity}>
              <Ionicons name="person-circle-outline" size={36} color={t.crimson} />
              <View><Text style={styles.editorName}>{editorMember?.firstName} {editorMember?.lastName}</Text><Text style={styles.editorCompetition}>{management?.competition.name}</Text></View>
            </View>
            {!editorMember?.registration ? (
              <View style={styles.warning}><Ionicons name="information-circle-outline" size={18} color={t.gold} /><Text style={styles.warningText}>Cet élève n’est pas inscrit. Son résultat peut quand même être enregistré.</Text></View>
            ) : null}

            <Text style={styles.fieldLabel}>CLASSEMENT</Text>
            <View style={styles.optionRow}>
              {PLACE_OPTIONS.map((item) => <Pressable key={item} style={[styles.placeOption, place === item && styles.optionActive]} onPress={() => setPlace(item)}><Text style={[styles.placeOptionText, place === item && styles.optionTextActive]}>{placeLabel(item)}</Text></Pressable>)}
            </View>

            <Text style={styles.fieldLabel}>TYPE</Text>
            <View style={styles.optionRow}>
              {(['GI', 'NO-GI'] as ResultType[]).map((item) => <Pressable key={item} style={[styles.typeOption, compType === item && styles.optionActive]} onPress={() => setCompType(item)}><Text style={[styles.optionText, compType === item && styles.optionTextActive]}>{item}</Text></Pressable>)}
            </View>

            <Text style={styles.fieldLabel}>CATÉGORIE DE POIDS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weightList}>
              {WEIGHT_OPTIONS.map((item) => <Pressable key={item} style={[styles.weightOption, weightClass === item && styles.optionActive]} onPress={() => setWeightClass(item)}><Text style={[styles.optionText, weightClass === item && styles.optionTextActive]}>{item}</Text></Pressable>)}
            </ScrollView>
            <TextInput value={weightClass} onChangeText={setWeightClass} placeholder="Ou saisir une catégorie libre" placeholderTextColor={t.textMute} style={styles.input} />

            <Text style={styles.fieldLabel}>NOTES (OPTIONNEL)</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Adversaires, catégorie, détails…" placeholderTextColor={t.textMute} multiline style={[styles.input, styles.notes]} />

            <Pressable disabled={saving} style={[styles.saveButton, saving && styles.disabled]} onPress={() => void saveResult()}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>ENREGISTRER LE RÉSULTAT</Text>}
            </Pressable>
            {editorMember?.result ? <Pressable disabled={saving} style={styles.deleteButton} onPress={deleteResult}><Text style={styles.deleteButtonText}>SUPPRIMER LE RÉSULTAT</Text></Pressable> : null}
          </FormScrollView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28 },
    muted: { color: t.textMute },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: t.hairline },
    back: { padding: 4 },
    backIcon: { fontSize: 30, color: t.bone, lineHeight: 30 },
    title: { color: t.bone, fontSize: 21, fontWeight: '900', letterSpacing: 1.5 },
    subtitle: { color: t.textMute, fontSize: 11, letterSpacing: 0.4 },
    headerIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: t.crimson, alignItems: 'center', justifyContent: 'center' },
    content: { paddingVertical: 18, paddingBottom: 48 },
    eyebrow: { paddingHorizontal: 18, marginBottom: 10, color: t.textMute, fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 2 },
    competitionList: { paddingHorizontal: 18, gap: 10 },
    competitionCard: { width: 230, minHeight: 142, padding: 14, borderRadius: 5, borderWidth: 1, borderColor: t.hairlineStrong, backgroundColor: t.surface, gap: 6 },
    competitionCardActive: { borderColor: t.crimson, backgroundColor: t.crimson + '0E' },
    competitionDate: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 },
    accent: { color: t.crimson },
    competitionName: { minHeight: 40, color: t.bone, fontSize: 16, fontWeight: '800' },
    competitionLocation: { color: t.textDim, fontSize: 12 },
    countRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' },
    count: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 0.5 },
    summary: { margin: 18, marginBottom: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: t.elevated, borderRadius: 5 },
    summaryValue: { color: t.bone, fontSize: 22, fontWeight: '900', textAlign: 'center' },
    summaryLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1 },
    summaryDivider: { width: 1, height: 34, backgroundColor: t.hairlineStrong },
    searchBox: { marginHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, height: 46, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 4, backgroundColor: t.surface },
    searchInput: { flex: 1, color: t.text, fontSize: 15 },
    filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 12 },
    filter: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 3 },
    filterActive: { borderColor: t.crimson, backgroundColor: t.crimson + '18' },
    filterText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 },
    filterTextActive: { color: t.crimson },
    members: { paddingHorizontal: 18, gap: 10 },
    memberCard: { padding: 14, borderRadius: 5, borderWidth: 1, borderColor: t.hairlineStrong, backgroundColor: t.surface, gap: 12 },
    memberTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.elevated, alignItems: 'center', justifyContent: 'center' },
    initials: { color: t.bone, fontWeight: '800' },
    memberIdentity: { flex: 1, gap: 3 },
    memberName: { color: t.bone, fontSize: 15, fontWeight: '800' },
    memberMeta: { color: t.textMute, fontSize: 11 },
    medal: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.gold, alignItems: 'center', justifyContent: 'center' },
    medalPlace: { color: t.gold, fontSize: 13, fontWeight: '900' },
    medalLabel: { color: t.gold, fontSize: 7, letterSpacing: 0.5 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: t.elevated },
    statusPillActive: { backgroundColor: t.crimson + '18' },
    statusText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.5 },
    statusTextActive: { color: t.crimson },
    resultMeta: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 9 },
    actions: { flexDirection: 'row', gap: 8 },
    secondaryButton: { flex: 1, height: 40, borderRadius: 3, borderWidth: 1, borderColor: t.hairlineStrong, alignItems: 'center', justifyContent: 'center' },
    secondaryButtonText: { color: t.bone, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
    dangerButton: { borderColor: t.crimson + '88' },
    dangerButtonText: { color: t.crimson },
    resultButton: { flex: 1, height: 40, borderRadius: 3, backgroundColor: t.crimson, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
    resultButtonText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    noMembers: { padding: 28, textAlign: 'center', color: t.textMute },
    emptyTitle: { color: t.bone, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    emptyText: { color: t.textMute, fontSize: 13, textAlign: 'center' },
    primaryButton: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 13, backgroundColor: t.crimson, borderRadius: 3 },
    primaryButtonText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    modal: { flex: 1, backgroundColor: t.ink },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.hairline },
    modalCancel: { width: 62, color: t.textMute, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.5 },
    modalTitle: { color: t.bone, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    modalContent: { padding: 18, paddingBottom: 54, gap: 12 },
    editorIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },
    editorName: { color: t.bone, fontSize: 17, fontWeight: '800' },
    editorCompetition: { color: t.textMute, fontSize: 12 },
    warning: { flexDirection: 'row', gap: 8, padding: 12, borderWidth: 1, borderColor: t.gold + '66', borderRadius: 4, backgroundColor: t.gold + '12' },
    warningText: { flex: 1, color: t.gold, fontSize: 12, lineHeight: 17 },
    fieldLabel: { marginTop: 8, color: t.textMute, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5 },
    optionRow: { flexDirection: 'row', gap: 8 },
    placeOption: { flex: 1, height: 48, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
    placeOptionText: { color: t.textDim, fontWeight: '900', fontSize: 13 },
    typeOption: { flex: 1, height: 44, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
    optionActive: { borderColor: t.crimson, backgroundColor: t.crimson + '18' },
    optionText: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 11 },
    optionTextActive: { color: t.crimson },
    weightList: { gap: 8 },
    weightOption: { paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
    input: { minHeight: 48, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 4, color: t.text, paddingHorizontal: 13, fontSize: 15, backgroundColor: t.surface },
    notes: { minHeight: 100, paddingTop: 13, textAlignVertical: 'top' },
    saveButton: { height: 52, marginTop: 8, borderRadius: 3, backgroundColor: t.crimson, alignItems: 'center', justifyContent: 'center' },
    saveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
    deleteButton: { height: 48, borderRadius: 3, borderWidth: 1, borderColor: t.crimson, alignItems: 'center', justifyContent: 'center' },
    deleteButtonText: { color: t.crimson, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
    disabled: { opacity: 0.55 },
  });
}
