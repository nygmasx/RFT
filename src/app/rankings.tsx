import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';

type Belt = 'blanche' | 'bleue' | 'violette' | 'marron' | 'noire';
type RankingRow = {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  belt: Belt | null;
  points: number;
  p4pPoints: number;
  resultCount: number;
  wins: number;
};
type RankingResponse = {
  p4p: RankingRow[];
  byBelt: Record<Belt, RankingRow[]>;
  rules: {
    stagePoints: Record<string, number>;
    importanceMultipliers: Record<string, number>;
    beltMultipliers: Record<string, number>;
    absoluteBonus: number;
  };
};
type OfficialAthlete = { name: string; academy?: string; rank?: number; points?: number; elo?: number; worldRank?: number; medals?: number; wins?: number; losses?: number; gold?: number; silver?: number; bronze?: number };
type OfficialMedal = { athlete: string; competition: string; division: string; place: number; year: number };
type OfficialSource<T> = { status: 'ok' | 'error'; url: string; data: T | null; error?: string };
type OfficialResponse = { updatedAt: string; bjjmetrics: OfficialSource<{ athletes: OfficialAthlete[]; medals: OfficialMedal[] }>; ajp: OfficialSource<OfficialAthlete[]>; cfjjb: OfficialSource<OfficialAthlete[]>; cfjjbResultsUrl: string };

const BELTS: Belt[] = ['blanche', 'bleue', 'violette', 'marron', 'noire'];
const BELT_LABELS: Record<Belt, string> = { blanche: 'BLANCHE', bleue: 'BLEUE', violette: 'VIOLETTE', marron: 'MARRON', noire: 'NOIRE' };
const BELT_COLORS: Record<Belt, string> = { blanche: '#EFE7D2', bleue: '#1E4B86', violette: '#6C3A91', marron: '#6A3D24', noire: '#171717' };
const STAGE_LABELS: Record<string, string> = { champion: 'Champion', finalist: 'Finaliste', semifinal: '1/2 finale', quarterfinal: '1/4 finale', round_of_16: '1/8 finale', round_of_32: '1/16 finale', participant: 'Participation' };
const IMPORTANCE_LABELS: Record<string, string> = { local: 'Locale', regional: 'Régionale', national: 'Nationale', international: 'Internationale', major: 'Majeure' };

export default function RankingsScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [data, setData] = useState<RankingResponse | null>(null);
  const [official, setOfficial] = useState<OfficialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<'club' | 'official'>('club');
  const [active, setActive] = useState<'p4p' | Belt>('p4p');
  const [showRules, setShowRules] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const [clubData, officialData] = await Promise.all([
        api.get<RankingResponse>('/api/rankings'),
        api.get<OfficialResponse>(`/api/rankings/official${force ? '?refresh=1' : ''}`),
      ]);
      setData(clubData); setOfficial(officialData);
    } catch (error: any) { console.error('[rankings]', error.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const rows = active === 'p4p' ? data?.p4p ?? [] : data?.byBelt[active] ?? [];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => safeBack('/palmares')} style={styles.back}><Text style={styles.backIcon}>‹</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>RONIN FIGHT TEAM</Text><Text style={styles.title}>CLASSEMENTS</Text></View>
          {mode === 'club' && <Pressable style={styles.rulesButton} onPress={() => setShowRules((value) => !value)}><Ionicons name="calculator-outline" size={17} color={t.crimson} /><Text style={styles.rulesButtonText}>BARÈME</Text></Pressable>}
        </View>
      </SafeAreaView>

      {loading ? <View style={styles.center}><ActivityIndicator color={t.crimson} /></View> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.crimson} onRefresh={() => {
          setRefreshing(true); void load(true).finally(() => setRefreshing(false));
        }} />}>
          <View style={styles.modeTabs}>
            <Pressable style={[styles.modeTab, mode === 'club' && styles.modeTabActive]} onPress={() => setMode('club')}><Text style={[styles.modeText, mode === 'club' && styles.modeTextActive]}>CLUB</Text></Pressable>
            <Pressable style={[styles.modeTab, mode === 'official' && styles.modeTabActive]} onPress={() => setMode('official')}><Text style={[styles.modeText, mode === 'official' && styles.modeTextActive]}>OFFICIEL</Text></Pressable>
          </View>
          {mode === 'club' ? <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            <Pressable style={[styles.tab, active === 'p4p' && styles.tabActive]} onPress={() => setActive('p4p')}><Text style={[styles.tabText, active === 'p4p' && styles.tabTextActive]}>P4P</Text></Pressable>
            {BELTS.map((belt) => <Pressable key={belt} style={[styles.tab, active === belt && styles.tabActive]} onPress={() => setActive(belt)}><View style={[styles.beltDot, { backgroundColor: BELT_COLORS[belt] }]} /><Text style={[styles.tabText, active === belt && styles.tabTextActive]}>{BELT_LABELS[belt]}</Text></Pressable>)}
          </ScrollView>

          {showRules && data ? (
            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>COMMENT SONT CALCULÉS LES POINTS ?</Text>
              <Text style={styles.formula}>TOUR ATTEINT × IMPORTANCE × CEINTURE P4P × BONUS ABSOLUTE</Text>
              <View style={styles.ruleGrid}>
                <View style={styles.ruleColumn}><Text style={styles.ruleHeading}>RÉSULTAT</Text>{Object.entries(data.rules.stagePoints).map(([key, value]) => <Text key={key} style={styles.ruleLine}>{STAGE_LABELS[key]} · {value} pts</Text>)}</View>
                <View style={styles.ruleColumn}><Text style={styles.ruleHeading}>COMPÉTITION</Text>{Object.entries(data.rules.importanceMultipliers).map(([key, value]) => <Text key={key} style={styles.ruleLine}>{IMPORTANCE_LABELS[key]} · ×{value}</Text>)}</View>
              </View>
              <Text style={styles.ruleFootnote}>Le classement par ceinture n’applique pas le multiplicateur de ceinture. Le P4P l’applique pour comparer le niveau d’opposition. Une catégorie absolue vaut ×{data.rules.absoluteBonus}.</Text>
            </View>
          ) : null}

          <View style={styles.headingRow}>
            <View><Text style={styles.listTitle}>{active === 'p4p' ? 'POUND-FOR-POUND' : `CEINTURE ${BELT_LABELS[active]}`}</Text><Text style={styles.listSubtitle}>RÉSULTATS VALIDÉS UNIQUEMENT</Text></View>
            <Text style={styles.total}>{rows.length} ATHLÈTE{rows.length > 1 ? 'S' : ''}</Text>
          </View>

          {rows.map((row) => {
            const mine = row.userId === user?.id;
            const points = active === 'p4p' ? row.p4pPoints : row.points;
            return <View key={row.userId} style={[styles.row, mine && styles.myRow]}>
              <Text style={[styles.rank, row.rank <= 3 && styles.podiumRank]}>{String(row.rank).padStart(2, '0')}</Text>
              {row.avatarUrl ? <Image source={{ uri: row.avatarUrl }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatarFallback}><Text style={styles.initials}>{row.firstName[0]}{row.lastName[0]}</Text></View>}
              <View style={styles.identity}>
                <Text style={styles.name}>{row.firstName} {row.lastName}{mine ? ' · MOI' : ''}</Text>
                <View style={styles.metaRow}>{row.belt ? <><View style={[styles.beltDot, { backgroundColor: BELT_COLORS[row.belt] }]} /><Text style={styles.meta}>{BELT_LABELS[row.belt]}</Text></> : null}<Text style={styles.meta}>· {row.resultCount} RÉS. · {row.wins} VICT.</Text></View>
              </View>
              <View style={styles.score}><Text style={styles.points}>{points}</Text><Text style={styles.pointsLabel}>PTS</Text></View>
            </View>;
          })}
          {rows.length === 0 ? <View style={styles.empty}><Ionicons name="podium-outline" size={36} color={t.textMute} /><Text style={styles.emptyText}>Aucun résultat validé dans ce classement.</Text></View> : null}
          </> : official ? <>
            <Text style={styles.officialIntro}>Données publiques officielles et agrégées pour les athlètes de la team. Mise à jour : {new Date(official.updatedAt).toLocaleString('fr-FR')}.</Text>
            <OfficialSection title="IBJJF · BJJMETRICS" source={official.bjjmetrics} t={t} styles={styles} rows={official.bjjmetrics.data?.athletes ?? []} />
            {(official.bjjmetrics.data?.medals?.length ?? 0) > 0 && <View style={styles.medalBlock}><Text style={styles.sourceTitle}>DERNIERS PODIUMS IBJJF</Text>{official.bjjmetrics.data!.medals.slice(0, 12).map((medal, index) => <View key={`${medal.athlete}-${medal.competition}-${index}`} style={styles.officialRow}><Text style={styles.officialRank}>{medal.place}</Text><View style={{ flex: 1 }}><Text style={styles.officialName}>{medal.athlete}</Text><Text style={styles.officialMeta}>{medal.competition} · {medal.division}</Text></View></View>)}</View>}
            <OfficialSection title="AJP TOUR" source={official.ajp} t={t} styles={styles} rows={official.ajp.data ?? []} />
            <OfficialSection title="CFJJB · TOP 10" source={official.cfjjb} t={t} styles={styles} rows={official.cfjjb.data ?? []} />
            <Pressable style={styles.resultsLink} onPress={() => void Linking.openURL(official.cfjjbResultsUrl)}><Ionicons name="open-outline" size={15} color={t.crimson} /><Text style={styles.resultsLinkText}>CONSULTER LES RÉSULTATS CFJJB</Text></Pressable>
            <Text style={styles.legalNote}>La page de résultats CFJJB exclut l’indexation automatisée ; elle est donc ouverte directement, sans copie de ses données.</Text>
          </> : null}
          <View style={{ height: 36 }} />
        </ScrollView>
      )}
    </View>
  );
}

function OfficialSection({ title, source, rows, t, styles }: { title: string; source: OfficialSource<any>; rows: OfficialAthlete[]; t: Theme; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.sourceBlock}>
    <View style={styles.sourceHeader}><Text style={styles.sourceTitle}>{title}</Text><Pressable onPress={() => void Linking.openURL(source.url)}><Text style={styles.sourceLink}>SOURCE ↗</Text></Pressable></View>
    {source.status === 'error' ? <Text style={styles.sourceError}>Source temporairement indisponible.</Text> : rows.length === 0 ? <Text style={styles.sourceEmpty}>Aucun athlète de la team présent dans ce classement public.</Text> : rows.slice(0, 30).map((row, index) => <View key={`${row.name}-${index}`} style={styles.officialRow}>
      <Text style={styles.officialRank}>{row.rank ?? index + 1}</Text>
      <View style={{ flex: 1 }}><Text style={styles.officialName}>{row.name}</Text><Text style={styles.officialMeta}>{row.academy ?? (row.elo ? `ELO ${row.elo} · ${row.medals ?? 0} MÉD.` : `${row.wins ?? 0} V · ${row.losses ?? 0} D`)}</Text></View>
      <Text style={styles.officialPoints}>{row.points ?? (row.worldRank ? `#${row.worldRank}` : '')}</Text>
    </View>)}
  </View>;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: t.hairline },
    back: { padding: 4 }, backIcon: { color: t.bone, fontSize: 29, lineHeight: 30 }, headerCopy: { flex: 1 },
    eyebrow: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 2 }, title: { color: t.bone, fontFamily: FONTS.display, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    rulesButton: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 9, borderWidth: 1, borderColor: t.crimson, borderRadius: 3 }, rulesButtonText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '800', letterSpacing: 1 },
    content: { paddingTop: 16 }, tabs: { paddingHorizontal: 18, gap: 7 }, tab: { height: 38, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 3 }, tabActive: { backgroundColor: t.crimson, borderColor: t.crimson }, tabText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }, tabTextActive: { color: '#FFF' }, beltDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#FFFFFF55' },
    modeTabs: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 14, borderWidth: 1, borderColor: t.hairlineStrong }, modeTab: { flex: 1, padding: 11, alignItems: 'center' }, modeTabActive: { backgroundColor: t.crimson }, modeText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, modeTextActive: { color: '#fff' },
    rulesCard: { margin: 18, marginBottom: 4, padding: 14, gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.gold + '77', borderRadius: 4 }, rulesTitle: { color: t.gold, fontFamily: FONTS.display, fontWeight: '900', fontSize: 13, letterSpacing: 1 }, formula: { color: t.bone, fontFamily: FONTS.mono, fontSize: 8.5, lineHeight: 14, letterSpacing: 0.7 }, ruleGrid: { flexDirection: 'row', gap: 18 }, ruleColumn: { flex: 1, gap: 4 }, ruleHeading: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '800', marginBottom: 2 }, ruleLine: { color: t.textDim, fontFamily: FONTS.mono, fontSize: 8.5 }, ruleFootnote: { color: t.textMute, fontSize: 10.5, lineHeight: 15 },
    headingRow: { margin: 18, marginBottom: 7, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, listTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 17, fontWeight: '900', letterSpacing: 0.8 }, listSubtitle: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1, marginTop: 3 }, total: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8 },
    row: { marginHorizontal: 18, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: t.hairline, paddingVertical: 10 }, myRow: { marginHorizontal: 10, paddingHorizontal: 8, backgroundColor: t.crimson + '12', borderLeftWidth: 3, borderLeftColor: t.crimson }, rank: { width: 28, color: t.textMute, fontFamily: FONTS.display, fontSize: 17, fontWeight: '900' }, podiumRank: { color: t.gold }, avatar: { width: 42, height: 42, borderRadius: 21 }, avatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: t.elevated }, initials: { color: t.bone, fontWeight: '800' }, identity: { flex: 1, minWidth: 0 }, name: { color: t.bone, fontSize: 13.5, fontWeight: '800' }, metaRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }, meta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8 }, score: { alignItems: 'flex-end' }, points: { color: t.crimson, fontFamily: FONTS.display, fontSize: 20, fontWeight: '900' }, pointsLabel: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7, letterSpacing: 1 },
    empty: { padding: 48, alignItems: 'center', gap: 10 }, emptyText: { color: t.textMute, fontSize: 12, textAlign: 'center' },
    officialIntro: { marginHorizontal: 18, color: t.textDim, fontSize: 11.5, lineHeight: 17, marginBottom: 8 }, sourceBlock: { margin: 18, marginBottom: 4, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, paddingHorizontal: 13 }, sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 }, sourceTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 13, fontWeight: '900', letterSpacing: 1 }, sourceLink: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800' }, sourceEmpty: { color: t.textMute, fontSize: 11, lineHeight: 16, paddingBottom: 13 }, sourceError: { color: t.crimson, fontSize: 11, paddingBottom: 13 }, officialRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: t.hairline, paddingVertical: 9 }, officialRank: { width: 26, color: t.gold, fontFamily: FONTS.display, fontSize: 16, fontWeight: '900' }, officialName: { color: t.bone, fontSize: 12.5, fontWeight: '800' }, officialMeta: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 7.5, marginTop: 3 }, officialPoints: { color: t.crimson, fontFamily: FONTS.display, fontSize: 15, fontWeight: '900' }, medalBlock: { marginHorizontal: 18, marginTop: 10, padding: 13, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline }, resultsLink: { marginHorizontal: 18, marginTop: 14, padding: 13, borderWidth: 1, borderColor: t.crimson, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, resultsLinkText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, legalNote: { marginHorizontal: 18, color: t.textMute, fontSize: 9.5, lineHeight: 14, marginTop: 8 },
  });
}
