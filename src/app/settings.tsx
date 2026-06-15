import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme, ThemeKey, THEMES, THEME_LABELS } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const THEME_SWATCHES: Record<ThemeKey, string> = {
  sumi: '#0A0A0A',
  light: '#F5F2ED',
  navy: '#080D1A',
  forest: '#080F0A',
  slate: '#0C0E10',
};

const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

function Toggle({ value, onChange, t }: { value: boolean; onChange: (v: boolean) => void; t: Theme }) {
  return (
    <Pressable
      style={[toggleSt(t).pill, { backgroundColor: value ? t.crimson : 'transparent', borderColor: value ? t.crimson : t.hairlineStrong }]}
      onPress={() => onChange(!value)}
    >
      <View style={[toggleSt(t).dot, { marginLeft: value ? 'auto' : 2, marginRight: value ? 2 : 'auto' }]} />
    </Pressable>
  );
}

function toggleSt(t: Theme) {
  return StyleSheet.create({
    pill: { width: 44, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
    dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
  });
}

export default function SettingsScreen() {
  const { theme: t, themeKey, setTheme } = useTheme();
  const { signOut } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [notifCoach, setNotifCoach]       = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifCompets, setNotifCompets]   = useState(true);
  const [notifCovoit, setNotifCovoit]     = useState(false);
  const [shareGrade, setShareGrade]       = useState(true);
  const [sharePalmares, setSharePalmares] = useState(true);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>PARAMÈTRES</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* APPARENCE */}
        <Text style={styles.sectionLabel}>APPARENCE</Text>
        <View style={styles.card}>
          <View style={styles.swatchRow}>
            {THEME_KEYS.map((key) => {
              const isActive = themeKey === key;
              return (
                <Pressable key={key} style={styles.swatchCell} onPress={() => setTheme(key)}>
                  <View style={[
                    styles.swatchCircle,
                    { backgroundColor: THEME_SWATCHES[key] },
                    isActive && styles.swatchCircleActive,
                  ]} />
                  <Text style={[styles.swatchLabel, isActive && styles.swatchLabelActive]}>
                    {THEME_LABELS[key].toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* MON COMPTE */}
        <Text style={styles.sectionLabel}>MON COMPTE</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="person-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Modifier le profil</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={[styles.row, styles.rowBorder]}>
            <Ionicons name="key-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Changer le mot de passe</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <View style={styles.row}>
            <Ionicons name="phone-portrait-outline" size={18} color={t.textDim} />
            <Text style={[styles.rowLabel, { color: t.textDim }]}>Téléphone : +33 6 12 34 56 78</Text>
          </View>
        </View>

        {/* NOTIFICATIONS */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Annonces du coach</Text>
            <Toggle value={notifCoach} onChange={setNotifCoach} t={t} />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Nouveaux messages</Text>
            <Toggle value={notifMessages} onChange={setNotifMessages} t={t} />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Compétitions & stages</Text>
            <Toggle value={notifCompets} onChange={setNotifCompets} t={t} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Covoiturages</Text>
            <Toggle value={notifCovoit} onChange={setNotifCovoit} t={t} />
          </View>
        </View>

        {/* CONFIDENTIALITÉ */}
        <Text style={styles.sectionLabel}>CONFIDENTIALITÉ</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Profil visible par</Text>
            <Text style={styles.rowValue}>Les membres</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Partager mon grade</Text>
            <Toggle value={shareGrade} onChange={setShareGrade} t={t} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Partager mon palmarès</Text>
            <Toggle value={sharePalmares} onChange={setSharePalmares} t={t} />
          </View>
        </View>

        {/* CLUB */}
        <Text style={styles.sectionLabel}>CLUB</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="link-outline" size={18} color={t.textDim} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Code d'invitation du club</Text>
            <Text style={styles.clubCode}>RONIN-2026</Text>
            <Ionicons name="copy-outline" size={17} color={t.textMute} />
          </View>
          <Pressable style={styles.row}>
            <Ionicons name="warning-outline" size={18} color={t.crimson} />
            <Text style={[styles.rowLabel, { color: t.crimson }]}>Quitter le club</Text>
          </Pressable>
        </View>

        {/* ASSISTANCE */}
        <Text style={styles.sectionLabel}>ASSISTANCE</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]}>
            <Ionicons name="bug-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Signaler un problème</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={[styles.row, styles.rowBorder]}>
            <Ionicons name="document-text-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Conditions d'utilisation</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={styles.row}>
            <Ionicons name="shield-checkmark-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Politique de confidentialité</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </View>

        {/* SESSION */}
        <Text style={styles.sectionLabel}>SESSION</Text>
        <View style={styles.card}>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={t.textDim} />
            <Text style={styles.rowLabel}>Se déconnecter</Text>
          </Pressable>
          <Pressable style={styles.row}>
            <Ionicons name="trash-outline" size={18} color={t.crimson} />
            <Text style={[styles.rowLabel, { color: t.crimson }]}>Supprimer mon compte</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>RONIN FIGHT TEAM · v1.0 (BETA)</Text>
          <View style={styles.footerSub}>
            <Text style={styles.footerSubText}>Fabriqué avec </Text>
            <Ionicons name="heart" size={12} color={t.crimson} />
            <Text style={styles.footerSubText}> pour le tatami</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    title: {
      flex: 1, fontFamily: FONTS.display, fontSize: 18, color: t.bone,
      fontWeight: '900', letterSpacing: 0.5,
    },
    scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 6 },

    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2,
      marginTop: 10, marginBottom: 4,
    },
    card: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 10,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: t.hairline },
    rowLabel: { fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '500', flex: 1 },
    rowArrow: { fontSize: 18, color: t.textMute },
    rowValue: { fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, letterSpacing: 0.5 },
    clubCode: { fontFamily: FONTS.mono, fontSize: 12, color: t.crimson, fontWeight: '700', letterSpacing: 1 },

    // Theme swatches
    swatchRow: {
      flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 16, gap: 8,
    },
    swatchCell: { flex: 1, alignItems: 'center', gap: 6 },
    swatchCircle: {
      width: 40, height: 40, borderRadius: 20,
      borderWidth: 2, borderColor: t.hairlineStrong,
    },
    swatchCircleActive: {
      borderColor: t.crimson, borderWidth: 3,
    },
    swatchLabel: {
      fontFamily: FONTS.mono, fontSize: 7.5, color: t.textMute, letterSpacing: 0.5,
    },
    swatchLabelActive: {
      color: t.crimson, fontWeight: '700',
    },

    footer: { alignItems: 'center', marginTop: 16, gap: 6 },
    footerText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5 },
    footerSub: { flexDirection: 'row', alignItems: 'center' },
    footerSubText: { fontFamily: FONTS.body, fontSize: 12, color: t.textMute },
  });
}
