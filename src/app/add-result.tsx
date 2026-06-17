import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type CompType = 'GI' | 'NO-GI' | 'GRAPPLING';
type AgeCategory = 'Senior' | 'Master 1' | 'Junior';
type Place = 1 | 2 | 3 | 4 | null;

const WEIGHT_OPTIONS = ['-64', '-70', '-77', '-85', '-94', 'ABS.'];
const TYPE_OPTIONS: CompType[] = ['GI', 'NO-GI', 'GRAPPLING'];
const AGE_OPTIONS: AgeCategory[] = ['Senior', 'Master 1', 'Junior'];

export default function AddResultScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();

  const PLACE_OPTIONS = [
    { place: 1 as Place, iconColor: '#D4A436', label: '1ER PLACE', selectedBg: '#D4A436' },
    { place: 2 as Place, iconColor: '#BFC4C7', label: '2E PLACE',  selectedBg: '#BFC4C7' },
    { place: 3 as Place, iconColor: '#C07A3A', label: '3E PLACE',  selectedBg: '#C07A3A' },
    { place: 4 as Place, iconColor: t.textDim,  label: 'TOP 4 / 5E+', selectedBg: t.elevated },
  ];

  const [compName, setCompName] = useState('');
  const [compDate, setCompDate] = useState('');
  const [compType, setCompType] = useState<CompType>('GI');
  const [weightClass, setWeightClass] = useState('-77');
  const [place, setPlace] = useState<Place>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !compName.trim() || !compDate.trim() || place === null) return;
    setSaving(true);

    // Parse date from dd.mm.yyyy to yyyy-mm-dd
    let isoDate = compDate;
    const parts = compDate.split('.');
    if (parts.length === 3) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    try {
      await api.post('/api/palmares', {
        competition_name: compName.trim(),
        comp_date:        isoDate,
        weight_class:     weightClass,
        comp_type:        compType === 'GRAPPLING' ? null : compType,
        place,
        notes:            notes.trim() || null,
      });
      router.back();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  const canSave = !!compName.trim() && !!compDate.trim() && place !== null && !saving;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>AJOUTER UN RÉSULTAT</Text>
          <Pressable onPress={handleSave} disabled={!canSave}>
            <Text style={[styles.saveText, !canSave && { opacity: 0.4 }]}>ENREGISTRER</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* COMPÉTITION */}
        <Text style={styles.sectionLabel}>COMPÉTITION</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>NOM DE LA COMPÉTITION</Text>
            <TextInput
              style={styles.input}
              value={compName}
              onChangeText={setCompName}
              placeholder="ex: Open BJJ de Paris"
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>DATE</Text>
            <TextInput
              style={styles.input}
              value={compDate}
              onChangeText={setCompDate}
              placeholder="jj.mm.aaaa"
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
        </View>

        {/* CATÉGORIE */}
        <Text style={styles.sectionLabel}>CATÉGORIE</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>TYPE</Text>
          <View style={styles.segmented}>
            {TYPE_OPTIONS.map((tp) => (
              <Pressable
                key={tp}
                style={[styles.pill, compType === tp && styles.pillActive]}
                onPress={() => setCompType(tp)}
              >
                <Text style={[styles.pillText, compType === tp && styles.pillTextActive]}>{tp}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>CATÉGORIE DE POIDS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={styles.chipsRow}>
              {WEIGHT_OPTIONS.map((w) => (
                <Pressable
                  key={w}
                  style={[styles.chip, weightClass === w && styles.chipActive]}
                  onPress={() => setWeightClass(w)}
                >
                  <Text style={[styles.chipText, weightClass === w && styles.chipTextActive]}>{w}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* RÉSULTAT */}
        <Text style={styles.sectionLabel}>RÉSULTAT</Text>
        <Text style={styles.sectionSubLabel}>PLACE</Text>
        <View style={styles.placeGrid}>
          {PLACE_OPTIONS.map((opt) => {
            const isSelected = place === opt.place;
            return (
              <Pressable
                key={String(opt.place)}
                style={[
                  styles.placeCard,
                  isSelected && { backgroundColor: opt.selectedBg, borderColor: t.crimson },
                ]}
                onPress={() => setPlace(opt.place)}
              >
                <Ionicons name="medal" size={28} color={opt.iconColor} />
                <Text style={[styles.placeLabel, isSelected && { color: t.bone, fontWeight: '900' }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* NOTES */}
        <Text style={styles.sectionLabel}>NOTES <Text style={styles.optionalLabel}>(optionnel)</Text></Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholder="Résumé, adversaires, points forts…"
            placeholderTextColor={t.textMute}
            selectionColor={t.crimson}
            textAlignVertical="top"
          />
        </View>

        {/* Save button */}
        <Pressable style={[styles.saveBtn, !canSave && { opacity: 0.5 }]} onPress={handleSave} disabled={!canSave}>
          <Text style={styles.saveBtnText}>
            {saving ? 'ENREGISTREMENT…' : 'ENREGISTRER CE RÉSULTAT'}
          </Text>
        </Pressable>

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
      flex: 1, fontFamily: FONTS.display, fontSize: 14, color: t.bone,
      fontWeight: '900', letterSpacing: 0.5,
    },
    saveText: { fontFamily: FONTS.mono, fontSize: 11, color: t.crimson, fontWeight: '700', letterSpacing: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },

    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 2,
      marginTop: 8, marginBottom: 4,
    },
    sectionSubLabel: {
      fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5, marginBottom: 6,
    },
    optionalLabel: { color: t.textMute, fontWeight: '400' },

    card: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, paddingHorizontal: 14, paddingVertical: 4,
    },
    divider: { height: 1, backgroundColor: t.hairline, marginVertical: 2 },

    fieldRow: { paddingVertical: 10 },
    fieldLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1.5, marginBottom: 6 },
    input: { fontFamily: FONTS.body, fontSize: 15, color: t.bone, fontWeight: '500', paddingVertical: 0 },
    textArea: { height: 80, lineHeight: 20 },

    segmented: { flexDirection: 'row', gap: 6, marginTop: 8 },
    pill: {
      flex: 1, paddingVertical: 8, borderRadius: 2, borderWidth: 1,
      borderColor: t.hairlineStrong, alignItems: 'center',
    },
    pillActive: { backgroundColor: t.crimson, borderColor: t.crimson },
    pillText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 0.5 },
    pillTextActive: { color: t.bone, fontWeight: '700' },

    chipsRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 2, borderWidth: 1,
      borderColor: t.hairlineStrong,
    },
    chipActive: { backgroundColor: t.crimson, borderColor: t.crimson },
    chipText: { fontFamily: FONTS.mono, fontSize: 10.5, color: t.textDim },
    chipTextActive: { color: t.bone, fontWeight: '700' },

    // Place grid
    placeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    placeCard: {
      width: '47%', paddingVertical: 18, alignItems: 'center', gap: 6,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    placeLabel: {
      fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, letterSpacing: 1, fontWeight: '600',
    },

    // Save button
    saveBtn: {
      marginTop: 8, backgroundColor: t.crimson, paddingVertical: 16,
      borderRadius: 3, alignItems: 'center',
    },
    saveBtnText: {
      fontFamily: FONTS.display, fontSize: 13, color: t.bone, fontWeight: '900', letterSpacing: 1.5,
    },
  });
}
