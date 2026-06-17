import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCompetitions, CompetitionWithSource } from '@/hooks/useCompetitions';
import { api } from '@/lib/api';

export default function CreateCarpoolScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();

  const { upcoming } = useCompetitions();

  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventList, setShowEventList] = useState(false);
  const [city, setCity] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState(2);

  const pad = (n: number) => String(n).padStart(2, '0');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedComp = upcoming.find((c) => c.id === selectedEvent);

  const handleSubmit = async () => {
    if (!user || !selectedEvent || !city.trim()) return;
    setSaving(true);

    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
    const departureAt = `${dateStr}T${timeStr}:00`;

    const costNum = parseFloat(cost.replace(',', '.')) || 0;

    const competitionId = selectedComp?._fromCalendar ? null : selectedEvent;

    try {
      await api.post('/api/carpools', {
        competition_id:  competitionId,
        departure_city:  city.trim(),
        departure_at:    departureAt,
        seats_total:     seats,
        cost_per_seat:   costNum,
        notes:           notes.trim() || null,
      });
      setSaving(false);
      router.back();
    } catch (e: any) {
      setSaving(false);
      Alert.alert('Erreur', e.message);
    }
  };

  const canSubmit = !!selectedEvent && !!city.trim() && !saving;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>PROPOSER UN COVOIT</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Événement */}
        <Text style={styles.fieldLabel}>ÉVÉNEMENT</Text>
        <Pressable
          style={styles.dropdown}
          onPress={() => setShowEventList((v) => !v)}
        >
          <Text style={selectedComp ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {selectedComp ? selectedComp.name : 'Sélectionner une compétition…'}
          </Text>
          <Text style={styles.dropdownArrow}>{showEventList ? '▲' : '▼'}</Text>
        </Pressable>

        {showEventList && (
          <View style={styles.eventList}>
            {upcoming.map((c, i) => {
              const d = new Date(c.comp_date);
              const day = String(d.getDate()).padStart(2, '0');
              const month = d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
              return (
                <Pressable
                  key={c.id}
                  style={[styles.eventOption, i > 0 && styles.eventOptionBorder]}
                  onPress={() => {
                    setSelectedEvent(c.id);
                    setShowEventList(false);
                  }}
                >
                  <View style={styles.eventOptionDate}>
                    <Text style={styles.eventOptionDay}>{day}</Text>
                    <Text style={styles.eventOptionMonth}>{month}</Text>
                  </View>
                  <View style={styles.eventOptionInfo}>
                    <Text style={styles.eventOptionName}>{c.name}</Text>
                    {c.location && <Text style={styles.eventOptionLoc}>{c.location}</Text>}
                  </View>
                  {selectedEvent === c.id && (
                    <Ionicons name="checkmark" size={16} color={t.crimson} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Ville de départ */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>VILLE DE DÉPART</Text>
        <TextInput
          style={styles.textInput}
          placeholder="ex: Creil, Senlis, Compiègne…"
          placeholderTextColor={t.textMute}
          value={city}
          onChangeText={setCity}
          autoCorrect={false}
        />

        {/* Date & Heure */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>DATE & HEURE</Text>
        <View style={styles.dateRow}>
          <Pressable style={[styles.textInput, styles.dateInput, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: t.bone, fontFamily: 'System', fontSize: 14 }}>
              {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </Pressable>
          <Pressable style={[styles.textInput, styles.timeInput, { justifyContent: 'center' }]} onPress={() => setShowTimePicker(true)}>
            <Text style={{ color: t.bone, fontFamily: 'System', fontSize: 14 }}>
              {`${pad(time.getHours())}:${pad(time.getMinutes())}`}
            </Text>
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="fr-FR"
            minimumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setDate(d); }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            onChange={(_, d) => { setShowTimePicker(Platform.OS === 'ios'); if (d) setTime(d); }}
          />
        )}

        {/* Nombre de places */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>NOMBRE DE PLACES</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepBtn, seats <= 1 && styles.stepBtnDisabled]}
            onPress={() => setSeats((s) => Math.max(1, s - 1))}
          >
            <Text style={[styles.stepIcon, seats <= 1 && styles.stepIconDisabled]}>−</Text>
          </Pressable>
          <View style={styles.stepValue}>
            <Text style={styles.stepNumber}>{seats}</Text>
            <Text style={styles.stepUnit}>PLACE{seats > 1 ? 'S' : ''}</Text>
          </View>
          <Pressable
            style={[styles.stepBtn, seats >= 7 && styles.stepBtnDisabled]}
            onPress={() => setSeats((s) => Math.min(7, s + 1))}
          >
            <Text style={[styles.stepIcon, seats >= 7 && styles.stepIconDisabled]}>+</Text>
          </Pressable>
        </View>

        {/* Participation aux frais */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>PARTICIPATION AUX FRAIS</Text>
        <TextInput
          style={styles.textInput}
          placeholder="ex: 5 ou 0 (gratuit)"
          placeholderTextColor={t.textMute}
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
        />

        {/* Notes */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>NOTES</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMulti]}
          placeholder="Point de rendez-vous, infos supplémentaires…"
          placeholderTextColor={t.textMute}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={styles.ctaWrap}>
        <Pressable
          style={[styles.ctaBtn, !canSubmit && styles.ctaBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.ctaBtnText}>
            {saving ? 'ENREGISTREMENT…' : 'PROPOSER CE COVOITURAGE'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4,
      borderBottomWidth: 1, borderBottomColor: t.hairline,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: t.bone, lineHeight: 28 },
    headerTitle: {
      flex: 1, textAlign: 'center',
      fontFamily: FONTS.display, fontSize: 13, color: t.bone,
      fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    },
    headerSpacer: { width: 36 },
    scroll: { paddingHorizontal: 20, paddingTop: 24 },
    fieldLabel: {
      fontFamily: FONTS.mono, fontSize: 10, color: t.textMute,
      letterSpacing: 2, marginBottom: 8,
    },
    dropdown: {
      height: 44, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
      paddingHorizontal: 14, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between',
    },
    dropdownValue: {
      fontFamily: FONTS.body, fontSize: 14, color: t.bone, flex: 1,
    },
    dropdownPlaceholder: {
      fontFamily: FONTS.body, fontSize: 14, color: t.textMute, flex: 1,
    },
    dropdownArrow: {
      fontFamily: FONTS.mono, fontSize: 10, color: t.textMute,
    },
    eventList: {
      backgroundColor: t.elevated,
      borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: 3,
      marginTop: 4, overflow: 'hidden',
    },
    eventOption: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 14,
    },
    eventOptionBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
    eventOptionDate: { alignItems: 'center', minWidth: 36 },
    eventOptionDay: {
      fontFamily: FONTS.display, fontSize: 20, color: t.crimson, fontWeight: '900',
    },
    eventOptionMonth: {
      fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1.5,
    },
    eventOptionInfo: { flex: 1 },
    eventOptionName: {
      fontFamily: FONTS.body, fontSize: 13, color: t.bone, fontWeight: '700',
    },
    eventOptionLoc: {
      fontFamily: FONTS.body, fontSize: 11, color: t.textDim, marginTop: 2,
    },
    textInput: {
      height: 44, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
      paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 14, color: t.bone,
    },
    textInputMulti: {
      height: 80, paddingTop: 12, paddingBottom: 12,
    },
    dateRow: { flexDirection: 'row', gap: 10 },
    dateInput: { flex: 2 },
    timeInput: { flex: 1 },
    stepper: {
      flexDirection: 'row', alignItems: 'center', gap: 0,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, overflow: 'hidden', alignSelf: 'flex-start',
    },
    stepBtn: {
      width: 50, height: 50, alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.elevated,
    },
    stepBtnDisabled: { opacity: 0.4 },
    stepIcon: {
      fontFamily: FONTS.display, fontSize: 22, color: t.bone, fontWeight: '900',
    },
    stepIconDisabled: { color: t.textMute },
    stepValue: {
      paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center',
    },
    stepNumber: {
      fontFamily: FONTS.display, fontSize: 28, color: t.bone, fontWeight: '900',
    },
    stepUnit: {
      fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5,
    },
    ctaWrap: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
      backgroundColor: t.ink, borderTopWidth: 1, borderTopColor: t.hairline,
    },
    ctaBtn: {
      height: 50, backgroundColor: t.crimson, borderRadius: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaBtnDisabled: { backgroundColor: t.elevated },
    ctaBtnText: {
      fontFamily: FONTS.display, fontSize: 13, color: t.bone,
      fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    },
  });
}
