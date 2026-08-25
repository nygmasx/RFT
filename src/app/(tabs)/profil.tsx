import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { Chip, EmptyState, IconButton, ScreenHeader, SectionHeading, Surface } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { haptics } from '@/lib/haptics';

const BELT_COLORS: Record<string, string> = {
  blanche: '#EFE7D2',
  bleue: '#1E4B86',
  violette: '#4D2D74',
  marron: '#4A2E1C',
  noire: '#0A0A0A',
};

const BELT_ORDER = ['blanche', 'bleue', 'violette', 'marron', 'noire'] as const;
const BELT_LABELS: Record<string, string> = {
  blanche: 'Blanche',
  bleue: 'Bleue',
  violette: 'Violette',
  marron: 'Marron',
  noire: 'Noire',
};

const MEDALS: Record<number, { color: string; label: string }> = {
  1: { color: '#D4A436', label: '1' },
  2: { color: '#BFC4C7', label: '2' },
  3: { color: '#C07A3A', label: '3' },
};

type IconName = keyof typeof Ionicons.glyphMap;

function BJJBelt({ color }: { color: string }) {
  return (
    <View accessibilityLabel={`Ceinture ${BELT_LABELS[color] ?? color}`} style={[beltStyles.belt, { backgroundColor: BELT_COLORS[color] ?? BELT_COLORS.blanche }]}>
      <View style={beltStyles.rankBar} />
      <View style={beltStyles.stitchTop} />
      <View style={beltStyles.stitchBottom} />
    </View>
  );
}

const beltStyles = StyleSheet.create({
  belt: { height: 42, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.48)' },
  rankBar: { position: 'absolute', top: 0, right: 24, bottom: 0, width: 74, backgroundColor: '#0A0A0A', borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.16)' },
  stitchTop: { position: 'absolute', top: 6, left: 8, right: 8, height: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  stitchBottom: { position: 'absolute', bottom: 6, left: 8, right: 8, height: 1, backgroundColor: 'rgba(0,0,0,0.24)' },
});

function MedalDisc({ place, theme, size = 34 }: { place: number; theme: Theme; size?: number }) {
  const medal = MEDALS[place];
  return (
    <View style={[medalStyles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: medal?.color ?? theme.elevated }]}>
      <Text style={[medalStyles.label, !medal && { color: theme.textDim }]}>{medal?.label ?? `T${place}`}</Text>
    </View>
  );
}

const medalStyles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.36)' },
  label: { color: '#1A1210', fontFamily: FONTS.display, fontSize: 11, fontWeight: '900' },
});

export default function ProfilScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const { profile, belt, palmares, loading, refetch } = useProfile();
  const isStaff = user?.role === 'coach' || user?.role === 'admin';

  const firstName = profile?.firstName ?? user?.firstName ?? '';
  const lastName = profile?.lastName ?? user?.lastName ?? '';
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}` || 'RFT';
  const memberId = profile?.memberId ? `#${profile.memberId}` : 'MEMBRE DU CLUB';
  const beltColor = belt?.color ?? 'blanche';
  const { gold, silver, bronze } = useMemo(() => palmares.reduce((counts, result) => {
    if (result.place === 1) counts.gold += 1;
    else if (result.place === 2) counts.silver += 1;
    else if (result.place === 3) counts.bronze += 1;
    return counts;
  }, { gold: 0, silver: 0, bronze: 0 }), [palmares]);
  const podiums = gold + silver + bronze;
  const recentResults = palmares.slice(0, 3);
  const currentBeltIndex = BELT_ORDER.indexOf(beltColor as typeof BELT_ORDER[number]);

  const refresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']}>
          <ScreenHeader eyebrow="Espace membre" title="PROFIL" />
        </SafeAreaView>
        <View style={styles.loader}>
          <View style={styles.loaderIcon}><ActivityIndicator color={theme.crimson} /></View>
          <Text style={styles.loaderText}>CHARGEMENT DU PROFIL</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          eyebrow={profile?.memberId ? `Membre #${profile.memberId}` : 'Espace membre'}
          title="PROFIL"
          action={(
            <View style={styles.headerActions}>
              {isStaff ? <IconButton icon="shield-outline" label="Ouvrir l’administration" onPress={() => router.push('/admin')} /> : null}
              <IconButton icon="settings-outline" label="Ouvrir les paramètres" onPress={() => router.push('/settings')} />
            </View>
          )}
        />
      </SafeAreaView>

      <ScrollView
        alwaysBounceVertical
        bounces
        contentContainerStyle={styles.scroll}
        decelerationRate="normal"
        refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityCard}>
          <View style={styles.identityGlow} />
          <View style={styles.identityTop}>
            <View style={styles.avatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <Pressable
              accessibilityLabel="Modifier le profil"
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                router.push('/edit-profile');
              }}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            >
              <Ionicons name="create-outline" size={17} color={theme.onAccent} />
              <Text style={styles.editButtonText}>MODIFIER</Text>
            </Pressable>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.memberNumber}>{memberId}</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2} style={styles.identityName}>
              {firstName.toLocaleUpperCase('fr-FR')} {lastName.toLocaleUpperCase('fr-FR')}
            </Text>
            <View style={styles.identityMeta}>
              {profile?.category ? <View style={styles.identityPill}><Text style={styles.identityPillText}>{profile.category}</Text></View> : null}
              {profile?.weightClass ? <View style={styles.identityPill}><Text style={styles.identityPillText}>{profile.weightClass}</Text></View> : null}
              {profile?.stance ? <View style={styles.identityPill}><Text style={styles.identityPillText}>{profile.stance}</Text></View> : null}
            </View>
          </View>
        </View>

        <Surface style={styles.beltCard}>
          <View style={styles.cardTopLine}>
            <View>
              <Text style={styles.cardEyebrow}>GRADE BJJ</Text>
              <Text style={styles.beltTitle}>CEINTURE {BELT_LABELS[beltColor]?.toLocaleUpperCase('fr-FR') ?? beltColor.toLocaleUpperCase('fr-FR')}</Text>
            </View>
            {isStaff ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/edit-belt')} style={styles.textAction}>
                <Text style={styles.textActionLabel}>MODIFIER</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.crimson} />
              </Pressable>
            ) : null}
          </View>
          <BJJBelt color={beltColor} />
          <Text style={styles.promotionText}>
            {belt?.promotedDate ? `Promu le ${belt.promotedDate}` : 'Date de promotion non renseignée'}
            {belt?.promotedBy ? ` · ${belt.promotedBy}` : ''}
          </Text>
          <View style={styles.beltProgress}>
            {BELT_ORDER.map((color, index) => {
              const reached = currentBeltIndex >= index;
              const active = color === beltColor;
              return (
                <View key={color} style={styles.beltStep}>
                  <View style={[styles.beltStepLine, reached && styles.beltStepLineReached]} />
                  <View style={[styles.beltDot, { backgroundColor: BELT_COLORS[color] }, active && styles.beltDotActive]} />
                  <Text style={[styles.beltStepLabel, active && styles.beltStepLabelActive]}>{BELT_LABELS[color].slice(0, 3)}</Text>
                </View>
              );
            })}
          </View>
        </Surface>

        <View style={styles.sectionBlock}>
          <SectionHeading title="Vue d’ensemble" meta="Tes accès et résultats" />
          <View style={styles.quickGrid}>
            <QuickAccess icon="pulse-outline" label="Activité" meta={`${palmares.length} résultat${palmares.length > 1 ? 's' : ''}`} onPress={() => router.push('/mon-activite')} styles={styles} theme={theme} />
            <QuickAccess icon="trophy-outline" label="Palmarès" meta={`${podiums} podium${podiums > 1 ? 's' : ''}`} onPress={() => router.push('/palmares')} styles={styles} theme={theme} />
            <QuickAccess icon="car-outline" label="Covoiturages" meta="Mes trajets" onPress={() => router.push('/mes-covoiturages')} styles={styles} theme={theme} wide />
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeading title="Palmarès" meta={`${palmares.length} compétition${palmares.length > 1 ? 's' : ''}`} actionLabel="Voir tout" onAction={() => router.push('/palmares')} />
          <View style={styles.medalGrid}>
            {[
              { place: 1, value: gold, label: 'Or' },
              { place: 2, value: silver, label: 'Argent' },
              { place: 3, value: bronze, label: 'Bronze' },
              { place: 4, value: palmares.length, label: 'Total' },
            ].map((item) => (
              <Surface key={item.label} style={styles.medalCard}>
                <MedalDisc place={item.place} size={30} theme={theme} />
                <Text style={styles.medalValue}>{item.value}</Text>
                <Text style={styles.medalLabel}>{item.label}</Text>
              </Surface>
            ))}
          </View>

          {recentResults.length > 0 ? (
            <Surface style={styles.resultsCard}>
              {recentResults.map((result, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={result.id}
                  onPress={() => router.push('/palmares')}
                  style={({ pressed }) => [styles.resultRow, index > 0 && styles.resultDivider, pressed && styles.pressed]}
                >
                  <MedalDisc place={result.place} theme={theme} />
                  <View style={styles.resultCopy}>
                    <Text style={styles.resultName} numberOfLines={1}>{result.competitionName}</Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>{result.compDate}{result.weightClass ? ` · ${result.weightClass}` : ''}</Text>
                  </View>
                  {result.compType ? <Chip label={result.compType} tone="muted" /> : null}
                  <Ionicons name="chevron-forward" size={17} color={theme.textMute} />
                </Pressable>
              ))}
            </Surface>
          ) : (
            <EmptyState
              icon="medal-outline"
              title="Ton palmarès commence ici"
              message="Ajoute ton premier résultat de compétition pour suivre ton parcours."
              actionLabel="Ajouter un résultat"
              onAction={() => router.push('/add-result')}
            />
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeading title="Compte" meta="Préférences et confidentialité" />
          <Surface style={styles.accountCard}>
            {([
              ['settings-outline', 'Paramètres', 'Thème, compte et préférences', '/settings'],
              ['lock-closed-outline', 'Confidentialité', 'Visibilité et données personnelles', '/settings'],
              ['notifications-outline', 'Notifications', 'Alertes et communications du club', '/settings'],
            ] as [IconName, string, string, '/settings'][]).map(([icon, title, subtitle, path], index) => (
              <Pressable
                accessibilityRole="button"
                key={title}
                onPress={() => router.push(path)}
                style={({ pressed }) => [styles.accountRow, index > 0 && styles.accountDivider, pressed && styles.pressed]}
              >
                <View style={styles.accountIcon}><Ionicons name={icon} size={19} color={theme.bone} /></View>
                <View style={styles.accountCopy}>
                  <Text style={styles.accountTitle}>{title}</Text>
                  <Text style={styles.accountSubtitle} numberOfLines={1}>{subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMute} />
              </Pressable>
            ))}
          </Surface>
        </View>

        <Text style={styles.footer}>RONIN FIGHT TEAM · VERSION 1.0</Text>
      </ScrollView>
    </View>
  );
}

function QuickAccess({ icon, label, meta, onPress, styles, theme, wide = false }: {
  icon: IconName;
  label: string;
  meta: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
  wide?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickCard, wide && styles.quickCardWide, pressed && styles.pressed]}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={21} color={theme.crimson} /></View>
      <View style={styles.quickCopy}>
        <Text style={styles.quickLabel}>{label}</Text>
        <Text style={styles.quickMeta}>{meta}</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={theme.textMute} />
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.ink },
    headerActions: { flexDirection: 'row', gap: 8 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loaderIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: `${theme.crimson}14` },
    loaderText: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
    scroll: { paddingHorizontal: Layout.gutter, paddingBottom: 120, gap: 24 },
    pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
    identityCard: { minHeight: 254, overflow: 'hidden', padding: 20, borderRadius: Radii.lg, backgroundColor: theme.crimsonDeep, justifyContent: 'space-between' },
    identityGlow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, right: -72, top: -92, backgroundColor: 'rgba(255,255,255,0.08)' },
    identityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    avatar: { width: 70, height: 70, overflow: 'hidden', borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    avatarText: { color: theme.onAccent, fontFamily: FONTS.display, fontSize: 22, fontWeight: '900' },
    editButton: { minHeight: Layout.touchTarget, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
    editButtonText: { color: theme.onAccent, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    identityCopy: { marginTop: 32 },
    memberNumber: { color: theme.onAccentMuted, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
    identityName: { color: theme.onAccent, fontFamily: FONTS.display, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -0.7, marginTop: 5 },
    identityMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
    identityPill: { minHeight: 25, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)' },
    identityPillText: { color: theme.onAccentMuted, fontFamily: FONTS.mono, fontSize: 8, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
    beltCard: { padding: 18 },
    cardTopLine: { minHeight: Layout.touchTarget, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    cardEyebrow: { color: theme.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
    beltTitle: { color: theme.bone, fontFamily: FONTS.display, fontSize: 19, fontWeight: '900', marginTop: 4 },
    textAction: { minHeight: Layout.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 5 },
    textActionLabel: { color: theme.crimson, fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.9 },
    promotionText: { color: theme.textDim, fontFamily: FONTS.body, fontSize: 12, marginTop: 10 },
    beltProgress: { flexDirection: 'row', marginTop: 18 },
    beltStep: { flex: 1, alignItems: 'center' },
    beltStepLine: { position: 'absolute', top: 8, left: 0, right: 0, height: 2, backgroundColor: theme.elevated },
    beltStepLineReached: { backgroundColor: `${theme.crimson}66` },
    beltDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.surface },
    beltDotActive: { borderColor: theme.crimson, transform: [{ scale: 1.15 }] },
    beltStepLabel: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 7.5, marginTop: 6, textTransform: 'uppercase' },
    beltStepLabelActive: { color: theme.crimson, fontWeight: '900' },
    sectionBlock: { gap: 12 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    quickCard: { width: '48.5%', minHeight: 112, padding: 14, borderRadius: Radii.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.hairline, justifyContent: 'space-between' },
    quickCardWide: { width: '100%', minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12 },
    quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: `${theme.crimson}14` },
    quickCopy: { flex: 1, minWidth: 0 },
    quickLabel: { color: theme.bone, fontFamily: FONTS.body, fontSize: 14, fontWeight: '800' },
    quickMeta: { color: theme.textDim, fontFamily: FONTS.body, fontSize: 11.5, marginTop: 3 },
    medalGrid: { flexDirection: 'row', gap: 8 },
    medalCard: { flex: 1, minHeight: 102, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
    medalValue: { color: theme.bone, fontFamily: FONTS.display, fontSize: 20, fontWeight: '900', marginTop: 5 },
    medalLabel: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 7.5, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 1 },
    resultsCard: { overflow: 'hidden' },
    resultRow: { minHeight: 76, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
    resultDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.hairline },
    resultCopy: { flex: 1, minWidth: 0 },
    resultName: { color: theme.bone, fontFamily: FONTS.body, fontSize: 13.5, fontWeight: '800' },
    resultMeta: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 0.5, marginTop: 4 },
    accountCard: { overflow: 'hidden' },
    accountRow: { minHeight: 76, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
    accountDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.hairline },
    accountIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.elevated },
    accountCopy: { flex: 1, minWidth: 0 },
    accountTitle: { color: theme.bone, fontFamily: FONTS.body, fontSize: 14, fontWeight: '800' },
    accountSubtitle: { color: theme.textDim, fontFamily: FONTS.body, fontSize: 11.5, marginTop: 3 },
    footer: { color: theme.textMute, fontFamily: FONTS.mono, fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center' },
  });
}
