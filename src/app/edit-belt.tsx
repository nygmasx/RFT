import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

type BeltColor = 'blanche' | 'bleue' | 'violette' | 'marron' | 'noire';

const BELT_COLORS: Record<BeltColor, string> = {
  blanche:  '#EFE7D2',
  bleue:    '#1E4B86',
  violette: '#4D2D74',
  marron:   '#4A2E1C',
  noire:    '#0A0A0A',
};

const BELT_ORDER: BeltColor[] = ['blanche', 'bleue', 'violette', 'marron', 'noire'];
const BELT_LABEL: Record<BeltColor, string> = {
  blanche: 'BLANCHE', bleue: 'BLEUE', violette: 'VIOLETTE', marron: 'MARRON', noire: 'NOIRE',
};

function BJJBelt({ color = 'marron', height = 40 }: { color?: string; height?: number }) {
  const bg = BELT_COLORS[color as BeltColor] ?? BELT_COLORS.marron;
  return (
    <View style={{ height, backgroundColor: bg, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.55)', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 6, right: 6, top: '50%', height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
    </View>
  );
}

export default function EditBeltScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const isCoach = user?.app_metadata?.role === 'coach';
  const targetUserId = userId ?? user?.id;

  const [selectedColor, setSelectedColor] = useState<BeltColor>('blanche');
  const [promotedBy, setPromotedBy]       = useState('');
  const [promotedDate, setPromotedDate]   = useState('');
  const [memberName, setMemberName]       = useState('');
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]             = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    if (!targetUserId) return;
    // Charge le grade existant
    supabase
      .from('belt_records')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedColor(data.color as BeltColor);
          setPromotedBy(data.promoted_by ?? '');
          setPromotedDate(data.promoted_date ?? '');
        }
      });

    // Charge le nom du membre
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', targetUserId)
      .single()
      .then(({ data }) => {
        if (data) setMemberName(`${data.first_name} ${data.last_name}`);
      });
  }, [targetUserId]);

  if (!isCoach) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: t.textMute, fontSize: 14 }}>Réservé aux coachs.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!targetUserId) return;
    setSaving(true);
    setError('');

    // Check for existing record
    const { data: existing } = await supabase
      .from('belt_records')
      .select('id')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let err;
    if (existing?.id) {
      ({ error: err } = await supabase
        .from('belt_records')
        .update({
          color: selectedColor,
          promoted_by: promotedBy.trim() || null,
          promoted_date: promotedDate.trim() || null,
        })
        .eq('id', existing.id));
    } else {
      ({ error: err } = await supabase
        .from('belt_records')
        .insert({
          user_id: targetUserId,
          color: selectedColor,
          promoted_by: promotedBy.trim() || null,
          promoted_date: promotedDate.trim() || null,
        }));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>GRADE BJJ{memberName ? ` — ${memberName.toUpperCase()}` : ''}</Text>
          <Pressable onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={t.crimson} size="small" />
              : success
                ? <Ionicons name="checkmark" size={22} color={t.crimson} />
                : <Text style={styles.saveText}>ENREGISTRER</Text>
            }
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Couleur */}
        <Text style={styles.sectionLabel}>COULEUR DE CEINTURE</Text>
        <View style={styles.card}>
          <View style={styles.colorRow}>
            {BELT_ORDER.map((b) => {
              const active = b === selectedColor;
              return (
                <Pressable key={b} style={styles.colorCell} onPress={() => setSelectedColor(b)}>
                  <View style={[styles.colorSwatch, {
                    backgroundColor: BELT_COLORS[b],
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? t.crimson : 'rgba(0,0,0,0.55)',
                  }]} />
                  <Text style={[styles.colorLabel, { color: active ? t.crimson : t.textMute }]}>
                    {BELT_LABEL[b].slice(0, 3)}.
                  </Text>
                  {active && <View style={styles.colorDot} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Aperçu */}
        <Text style={styles.sectionLabel}>APERÇU</Text>
        <View style={styles.card}>
          <BJJBelt color={selectedColor} height={48} />
          <Text style={[styles.previewName, { marginTop: 12, textAlign: 'center' }]}>
            {BELT_LABEL[selectedColor]}
          </Text>
        </View>

        {/* Progression */}
        <Text style={styles.sectionLabel}>PROGRESSION BJJ</Text>
        <View style={styles.card}>
          <View style={styles.progressRow}>
            {BELT_ORDER.map((b, i) => {
              const active = b === selectedColor;
              return (
                <View key={b} style={styles.progressCell}>
                  {i > 0 && <View style={styles.progressLine} />}
                  <View style={[styles.progressSwatch, {
                    backgroundColor: BELT_COLORS[b],
                    width: active ? 42 : 30, height: active ? 24 : 16,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? t.crimson : 'rgba(0,0,0,0.55)',
                  }]} />
                  <Text style={[styles.progressLabel, {
                    color: active ? t.crimson : t.textMute,
                    fontWeight: active ? '700' : '400',
                  }]}>{BELT_LABEL[b].slice(0, 4)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Détails promotion */}
        <Text style={styles.sectionLabel}>DÉTAILS DE LA PROMOTION</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>PROMU PAR</Text>
            <TextInput
              style={styles.input}
              value={promotedBy}
              onChangeText={setPromotedBy}
              placeholder="Coach Yannick"
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>DATE DE PROMOTION</Text>
            <TextInput
              style={styles.input}
              value={promotedDate}
              onChangeText={setPromotedDate}
              placeholder="jj.mm.aaaa"
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
        </View>

        {!!error && <Text style={{ color: t.crimson, fontSize: 12, textAlign: 'center' }}>{error}</Text>}
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
    title: { flex: 1, fontSize: 13, color: t.bone, fontWeight: '900', letterSpacing: 0.5 },
    saveText: { fontFamily: FONTS.mono, fontSize: 11, color: t.crimson, fontWeight: '700', letterSpacing: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },
    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2, marginTop: 8, marginBottom: 4,
    },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3, padding: 14 },
    colorRow: { flexDirection: 'row', gap: 8 },
    colorCell: { flex: 1, alignItems: 'center', gap: 4 },
    colorSwatch: { width: '100%', height: 36, borderRadius: 2 },
    colorLabel: { fontFamily: FONTS.mono, fontSize: 9 },
    colorDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: t.crimson },
    previewName: { fontFamily: FONTS.display, fontSize: 22, color: t.bone, fontWeight: '900' },
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    progressCell: { alignItems: 'center', gap: 4, flex: 1 },
    progressLine: { position: 'absolute', left: 0, right: '50%', top: '30%', height: 1, backgroundColor: t.hairlineStrong },
    progressSwatch: { borderRadius: 2 },
    progressLabel: { fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 0.5 },
    fieldRow: { paddingVertical: 10 },
    fieldLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1.5, marginBottom: 6 },
    input: { fontFamily: FONTS.body, fontSize: 15, color: t.bone, fontWeight: '500', paddingVertical: 0 },
    divider: { height: 1, backgroundColor: t.hairline, marginVertical: 2 },
  });
}
