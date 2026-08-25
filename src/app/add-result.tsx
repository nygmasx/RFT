import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { FormScrollView } from '@/components/form-scroll-view';
import DateTimePicker from '@/components/themed-date-time-picker';
import { DetailHeader } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';
import { Competition } from '@/lib/database.types';

type CompType = 'GI' | 'NO-GI' | 'GRAPPLING';
type ResultStage = 'champion' | 'finalist' | 'semifinal' | 'quarterfinal' | 'round_of_16' | 'round_of_32' | 'participant';

const WEIGHT_OPTIONS = ['-64', '-70', '-77', '-85', '-94', 'ABS.'];
const TYPE_OPTIONS: CompType[] = ['GI', 'NO-GI', 'GRAPPLING'];

export default function AddResultScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const { competitionId } = useLocalSearchParams<{ competitionId?: string }>();

  const RESULT_OPTIONS: { stage: ResultStage; iconColor: string; label: string; selectedBg: string }[] = [
    { stage: 'champion', iconColor: '#D4A436', label: '1ER · CHAMPION', selectedBg: '#6B4D0B' },
    { stage: 'finalist', iconColor: '#BFC4C7', label: '2E · FINALISTE', selectedBg: '#42474A' },
    { stage: 'semifinal', iconColor: '#C07A3A', label: '1/2 FINALE', selectedBg: '#603816' },
    { stage: 'quarterfinal', iconColor: t.textDim, label: '1/4 FINALE', selectedBg: t.elevated },
    { stage: 'round_of_16', iconColor: t.textDim, label: '1/8 · TOP 16', selectedBg: t.elevated },
    { stage: 'round_of_32', iconColor: t.textDim, label: '1/16 · TOP 32', selectedBg: t.elevated },
    { stage: 'participant', iconColor: t.textDim, label: 'PARTICIPATION', selectedBg: t.elevated },
  ];

  const [compName, setCompName] = useState('');
  const [compDate, setCompDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [compType, setCompType] = useState<CompType>('GI');
  const [weightClass, setWeightClass] = useState('-77');
  const [resultStage, setResultStage] = useState<ResultStage | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCompetition, setLoadingCompetition] = useState(Boolean(competitionId));

  useEffect(() => {
    if (!competitionId) return;
    api.get<Competition>(`/api/competitions/${competitionId}`)
      .then((competition) => {
        setCompName(competition.name);
        setCompDate(new Date(`${competition.comp_date}T12:00:00`));
        if (competition.comp_type === 'GI' || competition.comp_type === 'NO-GI') setCompType(competition.comp_type);
      })
      .catch((error) => Alert.alert('Compétition introuvable', error.message))
      .finally(() => setLoadingCompetition(false));
  }, [competitionId]);

  const pad = (n: number) => String(n).padStart(2, '0');

  const handleSave = async () => {
    if (!user || !compName.trim() || resultStage === null) return;
    setSaving(true);

    const isoDate = `${compDate.getFullYear()}-${pad(compDate.getMonth() + 1)}-${pad(compDate.getDate())}`;

    try {
      await api.post('/api/palmares', {
        competition_id: competitionId ?? null,
        competition_name: compName.trim(),
        comp_date:        isoDate,
        weight_class:     weightClass,
        comp_type:        compType === 'GRAPPLING' ? null : compType,
        result_stage:     resultStage,
        notes:            notes.trim() || null,
      });
      Alert.alert('Résultat envoyé', 'Ton coach doit maintenant le valider avant sa publication et sa prise en compte dans les classements.', [
        { text: 'OK', onPress: () => safeBack('/palmares') },
      ]);
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  const canSave = !!compName.trim() && resultStage !== null && !saving && !loadingCompetition;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <DetailHeader eyebrow="Palmarès" title="AJOUTER UN RÉSULTAT" onBack={() => safeBack('/palmares')} action={
          <Pressable accessibilityRole="button" hitSlop={10} onPress={handleSave} disabled={!canSave}>
            <Text style={[styles.saveText, !canSave && { opacity: 0.4 }]}>ENREGISTRER</Text>
          </Pressable>
        } />
      </SafeAreaView>

      <FormScrollView contentContainerStyle={styles.scroll}>

        {loadingCompetition ? <ActivityIndicator color={t.crimson} /> : null}
        <View style={styles.reviewNotice}>
          <Ionicons name="shield-checkmark-outline" size={20} color={t.gold} />
          <Text style={styles.reviewNoticeText}>Le résultat restera privé jusqu’à sa validation par un coach.</Text>
        </View>

        {/* COMPÉTITION */}
        <Text style={styles.sectionLabel}>COMPÉTITION</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>NOM DE LA COMPÉTITION</Text>
            <TextInput
              style={styles.input}
              value={compName}
              onChangeText={setCompName}
              editable={!competitionId}
              placeholder="ex: Open BJJ de Paris"
              placeholderTextColor={t.textMute}
              selectionColor={t.crimson}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>DATE</Text>
            <Pressable disabled={Boolean(competitionId)} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.input}>
                {compDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={compDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                locale="fr-FR"
                maximumDate={new Date()}
                onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setCompDate(d); }}
              />
            )}
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
          {RESULT_OPTIONS.map((opt) => {
            const isSelected = resultStage === opt.stage;
            return (
              <Pressable
                key={opt.stage}
                style={[
                  styles.placeCard,
                  isSelected && { backgroundColor: opt.selectedBg, borderColor: t.crimson },
                ]}
                onPress={() => setResultStage(opt.stage)}
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
      </FormScrollView>
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
    scroll: { paddingHorizontal: Layout.gutter, paddingTop: 8, gap: 10 },
    reviewNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.gold, padding: 14, borderRadius: Radii.md },
    reviewNoticeText: { flex: 1, color: t.textDim, fontFamily: FONTS.body, fontSize: 12, lineHeight: 17 },

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
      borderRadius: Radii.lg, paddingHorizontal: 14, paddingVertical: 4,
    },
    divider: { height: 1, backgroundColor: t.hairline, marginVertical: 2 },

    fieldRow: { paddingVertical: 10 },
    fieldLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1.5, marginBottom: 6 },
    input: { fontFamily: FONTS.body, fontSize: 15, color: t.bone, fontWeight: '500', paddingVertical: 0 },
    textArea: { height: 80, lineHeight: 20 },

    segmented: { flexDirection: 'row', gap: 6, marginTop: 8 },
    pill: {
      flex: 1, minHeight: Layout.touchTarget, paddingVertical: 8, borderRadius: Radii.md, borderWidth: 1,
      borderColor: t.hairlineStrong, alignItems: 'center',
    },
    pillActive: { backgroundColor: t.crimson, borderColor: t.crimson },
    pillText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textDim, letterSpacing: 0.5 },
    pillTextActive: { color: t.onAccent, fontWeight: '700' },

    chipsRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
    chip: {
      minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radii.round, borderWidth: 1,
      borderColor: t.hairlineStrong,
    },
    chipActive: { backgroundColor: t.crimson, borderColor: t.crimson },
    chipText: { fontFamily: FONTS.mono, fontSize: 10.5, color: t.textDim },
    chipTextActive: { color: t.onAccent, fontWeight: '700' },

    // Place grid
    placeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    placeCard: {
      width: '47%', paddingVertical: 18, alignItems: 'center', gap: 6,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.md,
    },
    placeLabel: {
      fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, letterSpacing: 1, fontWeight: '600',
    },

    // Save button
    saveBtn: {
      marginTop: 8, backgroundColor: t.crimson, paddingVertical: 16,
      minHeight: 50, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: {
      fontFamily: FONTS.display, fontSize: 13, color: t.onAccent, fontWeight: '900', letterSpacing: 1.5,
    },
  });
}
