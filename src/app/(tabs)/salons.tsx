import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SmoothRefreshControl } from '@/components/smooth-refresh-control';
import { Chip, EmptyState, IconButton, ScreenHeader, Surface } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useChannels } from '@/hooks/useChannels';
import { api } from '@/lib/api';
import { Channel } from '@/lib/database.types';
import { haptics } from '@/lib/haptics';

export default function SalonsScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { data: channels, loading, refetch } = useChannels();
  const isStaff = user?.role === 'coach' || user?.role === 'admin';

  const moderate = (channel: Channel) => {
    if (!isStaff) return;
    Alert.alert(channel.name, 'Modération du salon', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: channel.isLocked ? 'Déverrouiller' : 'Verrouiller',
        onPress: async () => {
          await api.put(`/api/channels/${channel.id}`, {
            name: channel.name,
            description: channel.description,
            is_private: channel.isPrivate,
            is_locked: !channel.isLocked,
          });
          refetch();
        },
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/api/channels/${channel.id}`);
          refetch();
        },
      },
    ]);
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
  const filtered = channels.filter((channel) => (
    channel.name.toLocaleLowerCase('fr-FR').includes(normalizedQuery)
    || (channel.description ?? '').toLocaleLowerCase('fr-FR').includes(normalizedQuery)
  ));
  const featured = normalizedQuery ? null : filtered[0] ?? null;
  const remaining = featured ? filtered.slice(1) : filtered;

  const openChannel = (channel: Channel) => {
    haptics.selection();
    router.push({ pathname: '/chat', params: { channel: channel.id, name: channel.name } });
  };

  const refresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          eyebrow={`${isStaff ? 'Espace coach · ' : ''}${channels.length} salon${channels.length > 1 ? 's' : ''}`}
          title={isStaff ? 'COMMUNICATION' : 'SALONS'}
          action={isStaff ? (
            <IconButton icon="add" label="Créer un salon" accent onPress={() => router.push('/create-channel')} />
          ) : undefined}
        />

        <View style={styles.searchWrap}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={t.textMute} />
            <TextInput
              accessibilityLabel="Rechercher un salon"
              returnKeyType="search"
              style={styles.searchInput}
              placeholder="Rechercher un salon"
              placeholderTextColor={t.textMute}
              value={query}
              onChangeText={setQuery}
            />
            {query ? (
              <Pressable
                accessibilityLabel="Effacer la recherche"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={t.textDim} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView automaticOffset behavior="padding" style={styles.flex}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <View style={styles.loaderIcon}>
              <ActivityIndicator color={t.crimson} />
            </View>
            <Text style={styles.loaderText}>CHARGEMENT DES SALONS</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={<SmoothRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          >
            {isStaff ? (
              <Surface accent="crimson" style={styles.staffCard}>
                <View style={styles.staffIcon}>
                  <Ionicons name="shield-checkmark" size={20} color={t.crimson} />
                </View>
                <View style={styles.staffCopy}>
                  <Text style={styles.staffTitle}>OUTILS DE MODÉRATION</Text>
                  <Text style={styles.staffText}>Appui long sur un salon pour le verrouiller ou le supprimer.</Text>
                </View>
              </Surface>
            ) : null}

            {featured ? (
              <Pressable
                accessibilityHint="Ouvre la discussion"
                accessibilityLabel={`Salon ${featured.name}`}
                accessibilityRole="button"
                onLongPress={() => moderate(featured)}
                onPress={() => openChannel(featured)}
                style={({ pressed }) => [styles.featured, pressed && styles.pressed]}
              >
                <View style={styles.featuredGlow} />
                <View style={styles.featuredTop}>
                  <View style={styles.featuredAvatar}>
                    <Ionicons name="sparkles" size={23} color="#FFFFFF" />
                  </View>
                  <Chip label="Salon principal" filled />
                </View>
                <View style={styles.featuredBottom}>
                  <View style={styles.featuredCopy}>
                    <Text style={styles.featuredEyebrow}>LE CLUB EN DIRECT</Text>
                    <Text style={styles.featuredTitle} numberOfLines={1}>{featured.name}</Text>
                    <Text style={styles.featuredDescription} numberOfLines={2}>
                      {featured.description || 'Retrouvez les dernières nouvelles et échangez avec le club.'}
                    </Text>
                  </View>
                  <View style={styles.featuredArrow}>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            ) : null}

            {remaining.length > 0 ? (
              <View style={styles.listSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{normalizedQuery ? 'RÉSULTATS' : 'TOUS LES SALONS'}</Text>
                  <Text style={styles.sectionCount}>{remaining.length}</Text>
                </View>
                <Surface style={styles.listSurface}>
                  {remaining.map((channel, index) => (
                    <ChannelRow
                      channel={channel}
                      isLast={index === remaining.length - 1}
                      isStaff={isStaff}
                      key={channel.id}
                      onLongPress={() => moderate(channel)}
                      onPress={() => openChannel(channel)}
                      styles={styles}
                      theme={t}
                    />
                  ))}
                </Surface>
              </View>
            ) : null}

            {filtered.length === 0 ? (
              <EmptyState
                icon={normalizedQuery ? 'search-outline' : 'chatbubbles-outline'}
                title={normalizedQuery ? 'Aucun salon trouvé' : 'Aucun salon pour le moment'}
                message={normalizedQuery
                  ? `Aucun résultat pour « ${query.trim()} ». Essaie un autre terme.`
                  : isStaff
                    ? 'Crée le premier espace de discussion du club.'
                    : 'Les salons du club apparaîtront ici dès leur création.'}
                actionLabel={normalizedQuery ? 'Effacer la recherche' : isStaff ? 'Créer un salon' : undefined}
                onAction={normalizedQuery ? () => setQuery('') : isStaff ? () => router.push('/create-channel') : undefined}
              />
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function ChannelRow({ channel, isLast, isStaff, onLongPress, onPress, styles, theme }: {
  channel: Channel;
  isLast: boolean;
  isStaff: boolean;
  onLongPress: () => void;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
}) {
  return (
    <Pressable
      accessibilityHint={isStaff ? 'Ouvre le salon. Appui long pour modérer.' : 'Ouvre la discussion'}
      accessibilityLabel={`Salon ${channel.name}${channel.isLocked ? ', verrouillé' : ''}${channel.isPrivate ? ', privé' : ''}`}
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowDivider, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{channel.name.slice(0, 1).toLocaleUpperCase('fr-FR')}</Text>
        {channel.isLocked ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={8} color={theme.textDim} />
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <View style={styles.nameLine}>
          <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
          {channel.isPrivate ? <Chip label="Privé" tone="muted" /> : null}
        </View>
        <Text style={styles.description} numberOfLines={1}>
          {channel.description || (channel.isLocked ? 'Discussion en lecture seule' : 'Rejoindre la discussion')}
        </Text>
      </View>
      <View style={styles.rowArrow}>
        <Ionicons name="chevron-forward" size={17} color={theme.textMute} />
      </View>
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    flex: { flex: 1 },
    searchWrap: { paddingHorizontal: Layout.gutter, paddingBottom: 14 },
    search: {
      minHeight: Layout.touchTarget,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: t.hairlineStrong,
      backgroundColor: t.surface,
    },
    searchInput: {
      flex: 1,
      minHeight: Layout.touchTarget,
      color: t.bone,
      fontFamily: FONTS.body,
      fontSize: 14,
      paddingVertical: 10,
    },
    clearButton: { width: 32, height: Layout.touchTarget, alignItems: 'center', justifyContent: 'center' },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loaderIcon: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 26,
      backgroundColor: `${t.crimson}14`,
    },
    loaderText: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
    content: { paddingHorizontal: Layout.gutter, paddingBottom: 112, gap: 18 },
    staffCard: { minHeight: 70, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    staffIcon: {
      width: Layout.touchTarget,
      height: Layout.touchTarget,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${t.crimson}14`,
    },
    staffCopy: { flex: 1 },
    staffTitle: { color: t.bone, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
    staffText: { color: t.textDim, fontFamily: FONTS.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
    featured: {
      minHeight: 218,
      overflow: 'hidden',
      padding: 18,
      borderRadius: Radii.lg,
      backgroundColor: t.crimsonDeep,
      justifyContent: 'space-between',
    },
    featuredGlow: {
      position: 'absolute',
      width: 190,
      height: 190,
      borderRadius: 95,
      right: -52,
      top: -78,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    featuredTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    featuredAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    featuredBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
    featuredCopy: { flex: 1, minWidth: 0 },
    featuredEyebrow: { color: 'rgba(255,255,255,0.72)', fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
    featuredTitle: { color: '#FFFFFF', fontFamily: FONTS.display, fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
    featuredDescription: { color: 'rgba(255,255,255,0.76)', fontFamily: FONTS.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
    featuredArrow: {
      width: Layout.touchTarget,
      height: Layout.touchTarget,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    listSection: { gap: 10 },
    sectionHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: t.bone, fontFamily: FONTS.display, fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
    sectionCount: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 10 },
    listSurface: { overflow: 'hidden' },
    row: { minHeight: 82, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.hairline },
    pressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.elevated,
      borderWidth: 1,
      borderColor: t.hairlineStrong,
    },
    avatarText: { color: t.bone, fontFamily: FONTS.display, fontSize: 18, fontWeight: '900' },
    lockBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.ink,
      borderWidth: 1,
      borderColor: t.hairlineStrong,
    },
    info: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    channelName: { flexShrink: 1, color: t.bone, fontFamily: FONTS.body, fontSize: 15, fontWeight: '800' },
    description: { color: t.textDim, fontFamily: FONTS.body, fontSize: 12.5, marginTop: 5 },
    rowArrow: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.elevated,
    },
  });
}
