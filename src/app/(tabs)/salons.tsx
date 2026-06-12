import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useChannels } from '@/hooks/useChannels';

export default function SalonsScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [query, setQuery] = useState('');

  const { data: channels, loading } = useChannels();

  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.count}>{String(channels.length).padStart(2, '0')} SALONS</Text>
            <Text style={styles.title}>SALONS</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => router.push('/create-channel')}>
            <Text style={styles.addIcon}>＋</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.search}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un salon, un message…"
              placeholderTextColor={t.textMute}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={t.crimson} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {filtered.map((c, i) => {
            const isTop = i === 0;
            return (
              <Pressable
                key={c.id}
                style={[styles.row, isTop && styles.rowTop]}
                onPress={() => router.push({ pathname: '/chat', params: { channel: c.id, name: c.name } })}
              >
                <View style={[styles.avatar, isTop && styles.avatarTop]}>
                  <Text style={[styles.avatarText, isTop && styles.avatarTextTop]}>
                    {isTop ? '☀' : c.name[0]}
                  </Text>
                  {c.is_locked && !isTop && (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                  )}
                </View>

                <View style={styles.info}>
                  <View style={styles.infoTop}>
                    <View style={styles.nameRow}>
                      <Text style={styles.chanName} numberOfLines={1}>{c.name}</Text>
                      {c.is_locked && (
                        <Text style={styles.lockInline}>🔒</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.infoBot}>
                    <Text style={styles.lastMsg} numberOfLines={1}>{c.description ?? ''}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
      paddingHorizontal: 24, paddingBottom: 14, paddingTop: 8,
    },
    count: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 2 },
    title: {
      fontFamily: FONTS.display, fontSize: 44, color: t.bone, fontWeight: '900',
      marginTop: 2, letterSpacing: 1,
    },
    addBtn: {
      width: 38, height: 38, backgroundColor: t.crimson,
      alignItems: 'center', justifyContent: 'center', borderRadius: 2,
    },
    addIcon: { color: t.bone, fontSize: 20, fontWeight: '600' },
    searchWrap: { paddingHorizontal: 20, paddingBottom: 16 },
    search: {
      height: 40, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 3,
    },
    searchIcon: { fontSize: 13 },
    searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 13, color: t.bone },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingVertical: 14, paddingHorizontal: 22,
      borderTopWidth: 1, borderTopColor: t.hairline,
    },
    rowTop: { backgroundColor: 'rgba(200,54,45,0.05)' },
    avatar: {
      width: 44, height: 44, borderRadius: 3, backgroundColor: t.elevated,
      borderWidth: 1, borderColor: t.hairline,
      alignItems: 'center', justifyContent: 'center', position: 'relative',
    },
    avatarTop: { backgroundColor: t.crimson, borderWidth: 0 },
    avatarText: { fontFamily: FONTS.display, fontSize: 20, color: t.bone, fontWeight: '900' },
    avatarTextTop: { color: t.bone },
    lockBadge: {
      position: 'absolute', bottom: -4, right: -4,
      width: 14, height: 14, backgroundColor: t.ink,
      borderWidth: 1, borderColor: t.hairlineStrong,
      borderRadius: 2, alignItems: 'center', justifyContent: 'center',
    },
    lockIcon: { fontSize: 7 },
    info: { flex: 1, minWidth: 0 },
    infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    chanName: {
      fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '700', flexShrink: 1,
    },
    lockInline: { fontSize: 10 },
    infoBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
    lastMsg: { fontFamily: FONTS.body, fontSize: 12, color: t.textDim, flex: 1 },
  });
}
