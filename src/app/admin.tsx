import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import { CalendarEvent, Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Tab = 'pending' | 'members' | 'calendar';
type ProfileWithStatus = Profile & { status: 'pending' | 'approved' | 'rejected' };
type EventType = CalendarEvent['type'];

interface BeltInfo {
  color: string;
  promoted_by: string | null;
  promoted_date: string | null;
}

const BELT_COLORS: Record<string, string> = {
  blanche: '#EFE7D2', bleue: '#1E4B86', violette: '#4D2D74', marron: '#4A2E1C', noire: '#0A0A0A',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Adultes': '#C8362D', 'Ados 13-17': '#C9A24B', 'Enfants 6-12': '#4A8F6D',
};

const EVT_COLORS: Record<EventType, string> = {
  cours: '#3B82F6', stage: '#C9A24B', compet: '#C8362D',
};

const EVT_LABELS: Record<EventType, string> = {
  cours: 'COURS', stage: 'STAGE', compet: 'COMPÉT.',
};

const EVT_TYPES: EventType[] = ['cours', 'stage', 'compet'];

export default function AdminScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<ProfileWithStatus[]>([]);
  const [members, setMembers] = useState<ProfileWithStatus[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Member detail modal
  const [selectedMember, setSelectedMember] = useState<ProfileWithStatus | null>(null);
  const [memberBelt, setMemberBelt] = useState<BeltInfo | null>(null);
  const [beltLoading, setBeltLoading] = useState(false);

  // Event creation form
  const [showCreate, setShowCreate] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtType, setEvtType] = useState<EventType>('cours');
  const [evtTime, setEvtTime] = useState('');
  const [evtPlace, setEvtPlace] = useState('');
  const [evtSaving, setEvtSaving] = useState(false);
  const [evtError, setEvtError] = useState('');

  const isCoach = user?.app_metadata?.role === 'coach';

  const fetchData = useCallback(async () => {
    const [pendingRes, membersRes, eventsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('status', 'pending').order('joined_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('status', 'approved').order('joined_at', { ascending: false }),
      supabase.from('calendar_events').select('*').order('event_date', { ascending: true }),
    ]);
    setPending((pendingRes.data as ProfileWithStatus[]) ?? []);
    setMembers((membersRes.data as ProfileWithStatus[]) ?? []);
    setEvents((eventsRes.data as CalendarEvent[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── Status actions ──────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    await fetchData();
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    await fetchData();
    setActionLoading(null);
  };

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    await supabase.from('profiles').update({ status: 'pending' }).eq('id', id);
    await fetchData();
    setActionLoading(null);
    setSelectedMember(null);
  };

  // ── Open member modal ───────────────────────────────────────────
  const openMember = async (profile: ProfileWithStatus) => {
    setSelectedMember(profile);
    setMemberBelt(null);
    setBeltLoading(true);
    const { data } = await supabase
      .from('belt_records')
      .select('color, promoted_by, promoted_date')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setMemberBelt(data);
    setBeltLoading(false);
  };

  // ── Calendar event creation ─────────────────────────────────────
  const handleCreateEvent = async () => {
    if (!evtTitle.trim() || !evtDate.trim()) {
      setEvtError('Titre et date requis.');
      return;
    }
    setEvtSaving(true);
    setEvtError('');
    const { error } = await supabase.from('calendar_events').insert({
      title: evtTitle.trim(),
      event_date: evtDate.trim(),
      type: evtType,
      event_time: evtTime.trim() || null,
      place: evtPlace.trim() || null,
    });
    setEvtSaving(false);
    if (error) { setEvtError(error.message); return; }
    setEvtTitle(''); setEvtDate(''); setEvtType('cours'); setEvtTime(''); setEvtPlace('');
    setShowCreate(false);
    fetchData();
  };

  const handleDeleteEvent = async (id: string) => {
    setActionLoading(id);
    await supabase.from('calendar_events').delete().eq('id', id);
    await fetchData();
    setActionLoading(null);
  };

  if (!isCoach) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: t.textMute, fontSize: 14 }}>Accès réservé aux coachs.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>ADMIN COACH</Text>
            <Text style={styles.subtitle}>Gestion des membres & événements</Text>
          </View>
          <View style={styles.coachBadge}>
            <Text style={styles.coachBadgeText}>COACH</Text>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
          {([
            ['pending', 'EN ATTENTE', pending.length > 0 ? pending.length : null],
            ['members', `MEMBRES (${members.length})`, null],
            ['calendar', 'CALENDRIER', null],
          ] as [Tab, string, number | null][]).map(([key, label, badge]) => (
            <Pressable key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]} onPress={() => setTab(key)}>
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
              {badge !== null && (
                <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={t.crimson} size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.crimson} />}
        >
          {/* ── Pending tab ─────────────────────────────────── */}
          {tab === 'pending' && (
            pending.length === 0
              ? <EmptyState icon="checkmark-circle-outline" text="Aucune demande en attente" t={t} />
              : pending.map((p) => (
                  <PendingCard
                    key={p.id}
                    profile={p}
                    loading={actionLoading === p.id}
                    onApprove={() => handleApprove(p.id)}
                    onReject={() => handleReject(p.id)}
                    styles={styles}
                    t={t}
                  />
                ))
          )}

          {/* ── Members tab ─────────────────────────────────── */}
          {tab === 'members' && (
            members.length === 0
              ? <EmptyState text="Aucun membre approuvé" t={t} />
              : members.map((p) => (
                  <Pressable key={p.id} onPress={() => openMember(p)}>
                    <MemberRow profile={p} styles={styles} t={t} />
                  </Pressable>
                ))
          )}

          {/* ── Calendar tab ─────────────────────────────────── */}
          {tab === 'calendar' && (
            <>
              <Pressable style={styles.createBtn} onPress={() => { setShowCreate((v) => !v); setEvtError(''); }}>
                <Text style={styles.createBtnText}>{showCreate ? 'ANNULER' : '＋  CRÉER UN ÉVÉNEMENT'}</Text>
              </Pressable>

              {showCreate && (
                <View style={styles.createForm}>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>TITRE</Text>
                    <TextInput
                      style={styles.input} value={evtTitle} onChangeText={setEvtTitle}
                      placeholder="Cours adultes — No-Gi" placeholderTextColor={t.textMute}
                      selectionColor={t.crimson}
                    />
                  </View>
                  <View style={styles.formDivider} />
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>DATE (AAAA-MM-JJ)</Text>
                    <TextInput
                      style={styles.input} value={evtDate} onChangeText={setEvtDate}
                      placeholder="2026-07-01" placeholderTextColor={t.textMute}
                      selectionColor={t.crimson} keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={styles.formDivider} />
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>TYPE</Text>
                    <View style={styles.typeRow}>
                      {EVT_TYPES.map((et) => (
                        <Pressable
                          key={et}
                          style={[styles.typeChip, evtType === et && {
                            backgroundColor: EVT_COLORS[et] + '22',
                            borderColor: EVT_COLORS[et],
                          }]}
                          onPress={() => setEvtType(et)}
                        >
                          <Text style={[styles.typeChipText, { color: evtType === et ? EVT_COLORS[et] : t.textMute }]}>
                            {EVT_LABELS[et]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formDivider} />
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>HEURE</Text>
                    <TextInput
                      style={styles.input} value={evtTime} onChangeText={setEvtTime}
                      placeholder="19:30" placeholderTextColor={t.textMute} selectionColor={t.crimson}
                    />
                  </View>
                  <View style={styles.formDivider} />
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>LIEU</Text>
                    <TextInput
                      style={styles.input} value={evtPlace} onChangeText={setEvtPlace}
                      placeholder="Tatami 2" placeholderTextColor={t.textMute} selectionColor={t.crimson}
                    />
                  </View>
                  {!!evtError && <Text style={{ color: t.crimson, fontSize: 12, marginTop: 8 }}>{evtError}</Text>}
                  <Pressable style={[styles.saveBtn, evtSaving && { opacity: 0.6 }]} onPress={handleCreateEvent} disabled={evtSaving}>
                    {evtSaving
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <Text style={styles.saveBtnText}>ENREGISTRER</Text>
                    }
                  </Pressable>
                </View>
              )}

              {events.length === 0
                ? <EmptyState icon="calendar-outline" text="Aucun événement" t={t} />
                : events.map((e) => (
                    <View key={e.id} style={styles.evtRow}>
                      <View style={[styles.evtBar, { backgroundColor: EVT_COLORS[e.type] }]} />
                      <View style={styles.evtContent}>
                        <View style={styles.evtTop}>
                          <Text style={styles.evtDate}>{e.event_date}</Text>
                          <View style={[styles.evtTag, { borderColor: EVT_COLORS[e.type] }]}>
                            <Text style={[styles.evtTagText, { color: EVT_COLORS[e.type] }]}>{EVT_LABELS[e.type]}</Text>
                          </View>
                        </View>
                        <Text style={styles.evtTitle}>{e.title}</Text>
                        {(e.event_time || e.place) && (
                          <Text style={styles.evtMeta}>{[e.event_time, e.place].filter(Boolean).join(' · ')}</Text>
                        )}
                      </View>
                      {actionLoading === e.id
                        ? <ActivityIndicator color={t.crimson} size="small" style={{ padding: 14 }} />
                        : (
                          <Pressable style={styles.evtDeleteBtn} onPress={() => handleDeleteEvent(e.id)}>
                            <Ionicons name="trash-outline" size={16} color={t.textMute} />
                          </Pressable>
                        )
                      }
                    </View>
                  ))
              }
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Member detail modal ─────────────────────────────────── */}
      <Modal
        visible={selectedMember !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedMember(null)} />
          <View style={styles.modalSheet}>
            {selectedMember && (
              <MemberDetailSheet
                profile={selectedMember}
                belt={memberBelt}
                beltLoading={beltLoading}
                actionLoading={actionLoading === selectedMember.id}
                onClose={() => setSelectedMember(null)}
                onRevoke={() => handleRevoke(selectedMember.id)}
                onEditBelt={() => {
                  setSelectedMember(null);
                  router.push({ pathname: '/edit-belt', params: { userId: selectedMember.id } });
                }}
                styles={styles}
                t={t}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ icon, text, t }: { icon?: string; text: string; t: Theme }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
      {icon && <Ionicons name={icon as any} size={40} color={t.textMute} />}
      <Text style={{ fontSize: 14, color: t.textMute }}>{text}</Text>
    </View>
  );
}

// ── Pending card ──────────────────────────────────────────────────
function PendingCard({
  profile, loading, onApprove, onReject, styles, t,
}: {
  profile: ProfileWithStatus;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
  styles: ReturnType<typeof makeStyles>;
  t: Theme;
}) {
  const joinDate = new Date(profile.joined_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <View style={styles.pendingCard}>
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          {profile.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
            : <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{profile.first_name[0]}{profile.last_name[0]}</Text>
              </View>
          }
          <View style={styles.pendingDot} />
        </View>
        <View style={styles.identity}>
          <Text style={styles.fullName}>{profile.first_name} {profile.last_name}</Text>
          <View style={styles.tags}>
            {profile.category && (
              <View style={[styles.tag, {
                backgroundColor: (CATEGORY_COLORS[profile.category] ?? t.textMute) + '22',
                borderColor: CATEGORY_COLORS[profile.category] ?? t.textMute,
              }]}>
                <Text style={[styles.tagText, { color: CATEGORY_COLORS[profile.category] ?? t.textMute }]}>
                  {profile.category}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.joinDate}>Inscrit le {joinDate}</Text>
        </View>
      </View>

      {profile.phone && (
        <View style={styles.contactRow}>
          <Ionicons name="phone-portrait-outline" size={14} color={t.textDim} />
          <Text style={styles.contactText}>{profile.phone}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={t.crimson} style={{ marginTop: 12 }} />
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.rejectBtn} onPress={onReject}>
            <Text style={styles.rejectText}>REFUSER</Text>
          </Pressable>
          <Pressable style={styles.approveBtn} onPress={onApprove}>
            <Text style={styles.approveText}>VALIDER</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Member row ────────────────────────────────────────────────────
function MemberRow({
  profile, styles, t,
}: {
  profile: ProfileWithStatus;
  styles: ReturnType<typeof makeStyles>;
  t: Theme;
}) {
  const catColor = CATEGORY_COLORS[profile.category ?? ''] ?? t.textMute;
  return (
    <View style={styles.memberRow}>
      {profile.avatar_url
        ? <Image source={{ uri: profile.avatar_url }} style={styles.memberAvatar} contentFit="cover" />
        : <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
            <Text style={styles.memberInitials}>{profile.first_name[0]}{profile.last_name[0]}</Text>
          </View>
      }
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{profile.first_name} {profile.last_name}</Text>
        <Text style={styles.memberMeta}>
          {profile.category ?? '—'}{profile.member_id ? ` · #${profile.member_id}` : ''}
        </Text>
      </View>
      {profile.category && <View style={[styles.catDot, { backgroundColor: catColor }]} />}
      <Text style={styles.memberArrow}>›</Text>
    </View>
  );
}

// ── Member detail sheet ────────────────────────────────────────────
function MemberDetailSheet({
  profile, belt, beltLoading, actionLoading,
  onClose, onRevoke, onEditBelt, styles, t,
}: {
  profile: ProfileWithStatus;
  belt: BeltInfo | null;
  beltLoading: boolean;
  actionLoading: boolean;
  onClose: () => void;
  onRevoke: () => void;
  onEditBelt: () => void;
  styles: ReturnType<typeof makeStyles>;
  t: Theme;
}) {
  const joinDate = new Date(profile.joined_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.sheetHandle}>
        <View style={styles.handleBar} />
      </View>

      <View style={styles.sheetBody}>
        {/* Avatar + name */}
        <View style={styles.sheetHeader}>
          {profile.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.sheetAvatar} contentFit="cover" />
            : <View style={[styles.sheetAvatar, styles.sheetAvatarFallback]}>
                <Text style={styles.sheetInitials}>{profile.first_name[0]}{profile.last_name[0]}</Text>
              </View>
          }
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetName}>{profile.first_name} {profile.last_name}</Text>
            {profile.member_id && (
              <Text style={styles.sheetMemberId}>MEMBRE #{profile.member_id}</Text>
            )}
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          {([
            ['CATÉGORIE', profile.category],
            ['POIDS', profile.weight_class],
            ['STANCE', profile.stance],
            ['TÉLÉPHONE', profile.phone],
            ['INSCRIT LE', joinDate],
          ] as [string, string | null][]).filter(([, v]) => v).map(([label, value]) => (
            <View key={label} style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>{label}</Text>
              <Text style={styles.infoCellValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Belt */}
        <View style={styles.sheetSection}>
          <Text style={styles.sheetSectionLabel}>GRADE BJJ</Text>
          {beltLoading ? (
            <ActivityIndicator color={t.crimson} size="small" style={{ marginTop: 10 }} />
          ) : belt ? (
            <View style={{ gap: 6, marginTop: 10 }}>
              <View style={{
                height: 28,
                backgroundColor: BELT_COLORS[belt.color] ?? BELT_COLORS.marron,
                borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.55)',
              }} />
              <Text style={styles.beltMeta}>
                {belt.color.toUpperCase()}
                {belt.promoted_by ? ` · par ${belt.promoted_by}` : ''}
                {belt.promoted_date ? ` · ${belt.promoted_date}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.beltEmpty}>Aucun grade enregistré</Text>
          )}
          <Pressable style={styles.editBeltBtn} onPress={onEditBelt}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="create-outline" size={12} color={t.crimson} />
              <Text style={styles.editBeltText}>MODIFIER LE GRADE</Text>
            </View>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.sheetActions}>
          <Pressable style={styles.revokeBtn} onPress={onRevoke} disabled={actionLoading}>
            {actionLoading
              ? <ActivityIndicator color={t.textDim} size="small" />
              : <Text style={styles.revokeText}>RÉVOQUER</Text>
            }
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>FERMER</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: 18, paddingTop: 14, gap: 12 },

    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    back: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    title: { fontSize: 18, fontWeight: '900', color: t.bone, letterSpacing: 1 },
    subtitle: { fontSize: 11, color: t.textMute, letterSpacing: 0.5 },
    coachBadge: {
      backgroundColor: t.crimson + '22', borderWidth: 1, borderColor: t.crimson,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    coachBadgeText: { fontSize: 10, fontWeight: '700', color: t.crimson, letterSpacing: 1.5 },

    tabsScroll: { borderBottomWidth: 1, borderBottomColor: t.hairline },
    tabs: { flexDirection: 'row', paddingHorizontal: 18 },
    tabBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 12, paddingHorizontal: 4, marginRight: 20,
      borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabBtnActive: { borderBottomColor: t.crimson },
    tabLabel: { fontFamily: FONTS.mono, fontSize: 11, color: t.textMute, letterSpacing: 1 },
    tabLabelActive: { color: t.bone },
    badge: {
      backgroundColor: t.crimson, borderRadius: 10,
      minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

    // Pending card
    pendingCard: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairlineStrong,
      borderRadius: 4, padding: 16, gap: 12,
    },
    cardTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    avatarWrap: { position: 'relative' },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarFallback: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: t.elevated, alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 18, fontWeight: '700', color: t.bone },
    pendingDot: {
      position: 'absolute', bottom: 0, right: 0,
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: t.gold, borderWidth: 2, borderColor: t.surface,
    },
    identity: { flex: 1, gap: 4 },
    fullName: { fontSize: 16, fontWeight: '700', color: t.bone },
    tags: { flexDirection: 'row', gap: 6 },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
    tagText: { fontSize: 10, fontWeight: '600' },
    joinDate: { fontSize: 11, color: t.textMute },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
    contactIcon: { fontSize: 13 },
    contactText: { fontSize: 13, color: t.textDim },
    actions: { flexDirection: 'row', gap: 10 },
    rejectBtn: {
      flex: 1, paddingVertical: 11, alignItems: 'center',
      borderRadius: 3, borderWidth: 1, borderColor: t.hairlineStrong,
    },
    rejectText: { fontSize: 12, fontWeight: '700', color: t.textDim, letterSpacing: 1 },
    approveBtn: {
      flex: 2, paddingVertical: 11, alignItems: 'center',
      borderRadius: 3, backgroundColor: t.crimson,
    },
    approveText: { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 1 },

    // Member row
    memberRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 4, padding: 12,
    },
    memberAvatar: { width: 42, height: 42, borderRadius: 21 },
    memberAvatarFallback: { backgroundColor: t.elevated, alignItems: 'center', justifyContent: 'center' },
    memberInitials: { fontSize: 15, fontWeight: '700', color: t.bone },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: '600', color: t.bone },
    memberMeta: { fontSize: 11, color: t.textMute, marginTop: 2 },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    memberArrow: { fontSize: 20, color: t.textMute, lineHeight: 22 },

    // Calendar management
    createBtn: {
      borderWidth: 1, borderColor: t.crimson, borderRadius: 3,
      paddingVertical: 12, alignItems: 'center',
    },
    createBtnText: { fontFamily: FONTS.mono, fontSize: 12, color: t.crimson, letterSpacing: 1.5, fontWeight: '700' },
    createForm: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, padding: 14,
    },
    fieldRow: { paddingVertical: 10 },
    fieldLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1.5, marginBottom: 6 },
    input: { fontFamily: FONTS.body, fontSize: 15, color: t.bone, fontWeight: '500', paddingVertical: 0 },
    formDivider: { height: 1, backgroundColor: t.hairline, marginVertical: 2 },
    typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    typeChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 3,
      borderWidth: 1, borderColor: t.hairlineStrong,
    },
    typeChipText: { fontFamily: FONTS.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    saveBtn: {
      backgroundColor: t.crimson, borderRadius: 3, paddingVertical: 13,
      alignItems: 'center', marginTop: 14,
    },
    saveBtnText: { fontFamily: FONTS.mono, fontSize: 12, color: '#FFF', fontWeight: '700', letterSpacing: 1.5 },
    evtRow: {
      flexDirection: 'row', backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3, overflow: 'hidden',
    },
    evtBar: { width: 4 },
    evtContent: { flex: 1, padding: 12 },
    evtTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    evtDate: { fontFamily: FONTS.mono, fontSize: 11, color: t.textMute, letterSpacing: 0.5 },
    evtTag: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderRadius: 2 },
    evtTagText: { fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '600', letterSpacing: 1 },
    evtTitle: { fontFamily: FONTS.body, fontSize: 13.5, color: t.bone, fontWeight: '600' },
    evtMeta: { fontFamily: FONTS.body, fontSize: 11, color: t.textDim, marginTop: 3 },
    evtDeleteBtn: { padding: 14, justifyContent: 'center' },
    evtDeleteText: { fontSize: 14, color: t.textMute },

    // Member detail modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: t.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
      maxHeight: '85%',
    },
    sheetHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.hairlineStrong },
    sheetBody: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    sheetAvatar: { width: 64, height: 64, borderRadius: 32 },
    sheetAvatarFallback: { backgroundColor: t.elevated, alignItems: 'center', justifyContent: 'center' },
    sheetInitials: { fontSize: 22, fontWeight: '700', color: t.bone },
    sheetName: { fontSize: 20, fontWeight: '900', color: t.bone },
    sheetMemberId: { fontFamily: FONTS.mono, fontSize: 11, color: t.textMute, letterSpacing: 1, marginTop: 2 },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoCell: { width: '47%', backgroundColor: t.elevated, padding: 10, borderRadius: 3 },
    infoCellLabel: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginBottom: 4 },
    infoCellValue: { fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '600' },

    sheetSection: { gap: 0 },
    sheetSectionLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2 },
    beltMeta: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 0.5 },
    beltEmpty: { fontFamily: FONTS.body, fontSize: 13, color: t.textMute, marginTop: 8 },
    editBeltBtn: {
      marginTop: 10, alignSelf: 'flex-start',
      paddingVertical: 6, paddingHorizontal: 12,
      borderWidth: 1, borderColor: t.crimson, borderRadius: 3,
    },
    editBeltText: { fontFamily: FONTS.mono, fontSize: 10, color: t.crimson, letterSpacing: 1 },

    sheetActions: { flexDirection: 'row', gap: 10 },
    revokeBtn: {
      flex: 1, paddingVertical: 12, alignItems: 'center',
      borderRadius: 3, borderWidth: 1, borderColor: t.hairlineStrong,
    },
    revokeText: { fontSize: 12, fontWeight: '700', color: t.textDim, letterSpacing: 1 },
    closeBtn: {
      flex: 2, paddingVertical: 12, alignItems: 'center',
      borderRadius: 3, backgroundColor: t.crimson,
    },
    closeBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 1 },
  });
}
