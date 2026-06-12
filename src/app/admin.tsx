import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type ProfileWithStatus = Profile & { status: 'pending' | 'approved' | 'rejected' };

const CATEGORY_COLORS: Record<string, string> = {
  'Adultes': '#C8362D',
  'Ados 13-17': '#C9A24B',
  'Enfants 6-12': '#4A8F6D',
};

export default function AdminScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [tab, setTab] = useState<'pending' | 'members'>('pending');
  const [pending, setPending] = useState<ProfileWithStatus[]>([]);
  const [members, setMembers] = useState<ProfileWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isCoach = user?.app_metadata?.role === 'coach';

  const fetchData = useCallback(async () => {
    const [pendingRes, membersRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('joined_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .order('joined_at', { ascending: false }),
    ]);
    setPending((pendingRes.data as ProfileWithStatus[]) ?? []);
    setMembers((membersRes.data as ProfileWithStatus[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleApprove = async (profileId: string) => {
    setActionLoading(profileId);
    await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', profileId);
    await fetchData();
    setActionLoading(null);
  };

  const handleReject = async (profileId: string) => {
    setActionLoading(profileId);
    await supabase
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', profileId);
    await fetchData();
    setActionLoading(null);
  };

  const handleRevoke = async (profileId: string) => {
    setActionLoading(profileId);
    await supabase
      .from('profiles')
      .update({ status: 'pending' })
      .eq('id', profileId);
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
          <View>
            <Text style={styles.title}>ADMIN COACH</Text>
            <Text style={styles.subtitle}>Gestion des membres</Text>
          </View>
          <View style={styles.coachBadge}>
            <Text style={styles.coachBadgeText}>COACH</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tabBtn, tab === 'pending' && styles.tabBtnActive]}
            onPress={() => setTab('pending')}
          >
            <Text style={[styles.tabLabel, tab === 'pending' && styles.tabLabelActive]}>
              EN ATTENTE
            </Text>
            {pending.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pending.length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'members' && styles.tabBtnActive]}
            onPress={() => setTab('members')}
          >
            <Text style={[styles.tabLabel, tab === 'members' && styles.tabLabelActive]}>
              MEMBRES ({members.length})
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.crimson} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.crimson} />}
        >
          {tab === 'pending' && (
            <>
              {pending.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>✅</Text>
                  <Text style={styles.emptyText}>Aucune demande en attente</Text>
                </View>
              ) : (
                pending.map((p) => (
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
            </>
          )}

          {tab === 'members' && (
            <>
              {members.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Aucun membre approuvé</Text>
                </View>
              ) : (
                members.map((p) => (
                  <MemberRow
                    key={p.id}
                    profile={p}
                    loading={actionLoading === p.id}
                    onRevoke={() => handleRevoke(p.id)}
                    styles={styles}
                    t={t}
                  />
                ))
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
      {/* Avatar + identity */}
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          {profile.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
            : <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {profile.first_name[0]}{profile.last_name[0]}
                </Text>
              </View>
          }
          <View style={styles.pendingDot} />
        </View>

        <View style={styles.identity}>
          <Text style={styles.fullName}>{profile.first_name} {profile.last_name}</Text>
          <View style={styles.tags}>
            {profile.category && (
              <View style={[styles.tag, { backgroundColor: (CATEGORY_COLORS[profile.category] ?? t.textMute) + '22', borderColor: CATEGORY_COLORS[profile.category] ?? t.textMute }]}>
                <Text style={[styles.tagText, { color: CATEGORY_COLORS[profile.category] ?? t.textMute }]}>
                  {profile.category}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.joinDate}>Inscrit le {joinDate}</Text>
        </View>
      </View>

      {/* Contact */}
      <View style={styles.contactBlock}>
        {profile.phone && (
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📱</Text>
            <Text style={styles.contactText}>{profile.phone}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {loading ? (
        <ActivityIndicator color={t.crimson} style={{ marginTop: 12 }} />
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.rejectBtn} onPress={onReject}>
            <Text style={styles.rejectText}>✕  REFUSER</Text>
          </Pressable>
          <Pressable style={styles.approveBtn} onPress={onApprove}>
            <Text style={styles.approveText}>✓  VALIDER</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Member row ────────────────────────────────────────────────────
function MemberRow({
  profile, loading, onRevoke, styles, t,
}: {
  profile: ProfileWithStatus;
  loading: boolean;
  onRevoke: () => void;
  styles: ReturnType<typeof makeStyles>;
  t: Theme;
}) {
  return (
    <View style={styles.memberRow}>
      {profile.avatar_url
        ? <Image source={{ uri: profile.avatar_url }} style={styles.memberAvatar} contentFit="cover" />
        : <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
            <Text style={styles.memberInitials}>
              {profile.first_name[0]}{profile.last_name[0]}
            </Text>
          </View>
      }
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{profile.first_name} {profile.last_name}</Text>
        <Text style={styles.memberMeta}>{profile.category ?? '—'} · {profile.member_id ?? 'N/A'}</Text>
      </View>
      <View style={styles.approvedBadge}>
        <Text style={styles.approvedText}>✓</Text>
      </View>
      {loading
        ? <ActivityIndicator color={t.crimson} size="small" />
        : <Pressable onPress={onRevoke} style={styles.revokeBtn}>
            <Text style={styles.revokeText}>↩</Text>
          </Pressable>
      }
    </View>
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
      marginLeft: 'auto', backgroundColor: t.crimson + '22',
      borderWidth: 1, borderColor: t.crimson,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    coachBadgeText: { fontSize: 10, fontWeight: '700', color: t.crimson, letterSpacing: 1.5 },

    tabs: {
      flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.hairline,
      paddingHorizontal: 18,
    },
    tabBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 12, paddingHorizontal: 4, marginRight: 24,
      borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabBtnActive: { borderBottomColor: t.crimson },
    tabLabel: { fontFamily: FONTS.mono, fontSize: 11, color: t.textMute, letterSpacing: 1 },
    tabLabelActive: { color: t.bone },
    badge: {
      backgroundColor: t.crimson, borderRadius: 10,
      minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 14, color: t.textMute },

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

    contactBlock: { gap: 6, paddingLeft: 4 },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    memberAvatar: { width: 40, height: 40, borderRadius: 20 },
    memberAvatarFallback: { backgroundColor: t.elevated, alignItems: 'center', justifyContent: 'center' },
    memberInitials: { fontSize: 14, fontWeight: '700', color: t.bone },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: '600', color: t.bone },
    memberMeta: { fontSize: 11, color: t.textMute, marginTop: 2 },
    approvedBadge: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: '#4A8F6D22', borderWidth: 1, borderColor: '#4A8F6D',
      alignItems: 'center', justifyContent: 'center',
    },
    approvedText: { fontSize: 12, color: '#4A8F6D', fontWeight: '700' },
    revokeBtn: {
      width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    },
    revokeText: { fontSize: 18, color: t.textMute },
  });
}
