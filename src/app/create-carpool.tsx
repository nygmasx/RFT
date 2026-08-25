import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { FormScrollView } from '@/components/form-scroll-view';
import DateTimePicker from '@/components/themed-date-time-picker';
import { AddressAutocomplete, AddressSuggestion } from '@/components/address-autocomplete';
import { DetailHeader } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCompetitions } from '@/hooks/useCompetitions';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';

export default function CreateCarpoolScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();

  const { upcoming } = useCompetitions();
  const { data: calendarEvents } = useCalendarEvents();
  const trainings = useMemo(() => calendarEvents.filter((event) => event.type === 'cours'), [calendarEvents]);

  const [selectedEvent, setSelectedEvent] = useState<{ kind: 'competition' | 'training'; id: string } | null>(null);
  const [showEventList, setShowEventList] = useState(false);
  const [departureAddress, setDepartureAddress] = useState('');
  const [departurePoint, setDeparturePoint] = useState<AddressSuggestion | null>(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState(2);

  const pad = (n: number) => String(n).padStart(2, '0');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCarpool, setLoadingCarpool] = useState(Boolean(id));

  const selectedComp = selectedEvent?.kind === 'competition'
    ? upcoming.find((c) => c.id === selectedEvent.id)
    : undefined;
  const selectedTraining = selectedEvent?.kind === 'training'
    ? trainings.find((event) => event.id === selectedEvent.id)
    : undefined;
  const selectedEventName = selectedComp?.name ?? selectedTraining?.title;

  useEffect(() => {
    if (!id) return;
    let active = true;
    api.get<{
      competition_id: string | null;
      calendar_event_id: string | null;
      departure_city: string;
      departure_latitude: number | null;
      departure_longitude: number | null;
      departure_at: string;
      seats_total: number;
      cost_per_seat: number;
      notes: string | null;
    }>(`/api/carpools/${id}/edit`).then((carpool) => {
      if (!active) return;
      if (carpool.competition_id) setSelectedEvent({ kind: 'competition', id: carpool.competition_id });
      else if (carpool.calendar_event_id) setSelectedEvent({ kind: 'training', id: carpool.calendar_event_id });
      setDepartureAddress(carpool.departure_city);
      setDeparturePoint({
        label: carpool.departure_city,
        latitude: carpool.departure_latitude ?? Number.NaN,
        longitude: carpool.departure_longitude ?? Number.NaN,
      });
      const departure = new Date(carpool.departure_at);
      if (!Number.isNaN(departure.getTime())) {
        setDate(departure);
        setTime(departure);
      }
      setSeats(carpool.seats_total);
      setCost(carpool.cost_per_seat ? String(carpool.cost_per_seat) : '');
      setNotes(carpool.notes ?? '');
    }).catch((error: Error) => {
      if (active) Alert.alert('Covoiturage indisponible', error.message, [
        { text: 'Retour', onPress: () => safeBack('/(tabs)/covoiturage') },
      ]);
    }).finally(() => {
      if (active) setLoadingCarpool(false);
    });
    return () => { active = false; };
  }, [id]);

  const handleSubmit = async () => {
    if (!user || !selectedEvent || !departurePoint) return;
    setSaving(true);

    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
    const departureAt = `${dateStr}T${timeStr}:00`;

    const costNum = parseFloat(cost.replace(',', '.')) || 0;

    try {
      const payload = {
        competition_id: selectedEvent.kind === 'competition' ? selectedEvent.id : null,
        calendar_event_id: selectedEvent.kind === 'training' ? selectedEvent.id : null,
        departure_city:  departurePoint.label,
        departure_latitude: departurePoint.latitude,
        departure_longitude: departurePoint.longitude,
        departure_at:    departureAt,
        seats_total:     seats,
        cost_per_seat:   costNum,
        notes:           notes.trim() || null,
      };
      if (id) await api.put(`/api/carpools/${id}`, payload);
      else await api.post('/api/carpools', payload);
      setSaving(false);
      safeBack('/(tabs)/covoiturage');
    } catch (e: any) {
      setSaving(false);
      Alert.alert('Erreur', e.message);
    }
  };

  const canSubmit = !!selectedEvent && !!departurePoint && !saving && !loadingCarpool;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <DetailHeader eyebrow="Mobilité du club" title={id ? 'MODIFIER LE COVOIT' : 'PROPOSER UN COVOIT'} onBack={() => safeBack('/(tabs)/covoiturage')} />
      </SafeAreaView>

      {loadingCarpool ? (
        <View style={styles.loader}><ActivityIndicator color={t.crimson} /></View>
      ) : <FormScrollView
        contentContainerStyle={styles.scroll}
      >
        {/* Événement */}
        <Text style={styles.fieldLabel}>ÉVÉNEMENT</Text>
        <Pressable
          style={styles.dropdown}
          onPress={() => setShowEventList((v) => !v)}
        >
          <Text style={selectedEventName ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {selectedEventName ?? 'Sélectionner une compétition ou un entraînement…'}
          </Text>
          <Text style={styles.dropdownArrow}>{showEventList ? '▲' : '▼'}</Text>
        </Pressable>

        {showEventList && (
          <View style={styles.eventList}>
            {upcoming.length > 0 && <Text style={styles.eventGroupLabel}>COMPÉTITIONS</Text>}
            {upcoming.map((c, i) => {
              const d = new Date(c.comp_date);
              const day = String(d.getDate()).padStart(2, '0');
              const month = d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
              return (
                <Pressable
                  key={c.id}
                  style={[styles.eventOption, (i > 0) && styles.eventOptionBorder]}
                  onPress={() => {
                    setSelectedEvent({ kind: 'competition', id: c.id });
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
                  {selectedEvent?.kind === 'competition' && selectedEvent.id === c.id && (
                    <Ionicons name="checkmark" size={16} color={t.crimson} />
                  )}
                </Pressable>
              );
            })}
            {trainings.length > 0 && <Text style={styles.eventGroupLabel}>ENTRAÎNEMENTS</Text>}
            {trainings.map((event) => {
              const d = new Date(`${event.eventDate}T12:00:00`);
              return (
                <Pressable
                  key={event.id}
                  style={[styles.eventOption, styles.eventOptionBorder]}
                  onPress={() => {
                    setSelectedEvent({ kind: 'training', id: event.id });
                    setShowEventList(false);
                  }}
                >
                  <View style={styles.eventOptionDate}>
                    <Text style={styles.eventOptionDay}>{String(d.getDate()).padStart(2, '0')}</Text>
                    <Text style={styles.eventOptionMonth}>{d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase()}</Text>
                  </View>
                  <View style={styles.eventOptionInfo}>
                    <Text style={styles.eventOptionName}>{event.title}</Text>
                    {!!event.place && <Text style={styles.eventOptionLoc}>{event.place}</Text>}
                  </View>
                  {selectedEvent?.kind === 'training' && selectedEvent.id === event.id && (
                    <Ionicons name="checkmark" size={16} color={t.crimson} />
                  )}
                </Pressable>
              );
            })}
            {upcoming.length === 0 && trainings.length === 0 && (
              <Text style={styles.emptyEvents}>AUCUN ÉVÉNEMENT À VENIR</Text>
            )}
          </View>
        )}

        {/* Adresse de départ */}
        <Text style={[styles.fieldLabel, { marginTop: 22 }]}>ADRESSE DE DÉPART</Text>
        <AddressAutocomplete
          placeholder="12 rue de la République, Creil…"
          value={departureAddress}
          onChange={(value) => { setDepartureAddress(value); setDeparturePoint(null); }}
          onSelect={(suggestion) => { setDepartureAddress(suggestion.label); setDeparturePoint(suggestion); }}
        />
        <Text style={[styles.addressHint, departurePoint && styles.addressHintValid]}>
          {departurePoint ? '✓ ADRESSE PRÊTE' : 'SÉLECTIONNE UNE ADRESSE DANS LA LISTE'}
        </Text>

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
      </FormScrollView>}

      <SafeAreaView edges={['bottom']} style={styles.ctaWrap}>
        <Pressable
          style={[styles.ctaBtn, !canSubmit && styles.ctaBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.ctaBtnText}>
            {saving ? 'ENREGISTREMENT…' : id ? 'ENREGISTRER LES MODIFICATIONS' : 'PROPOSER CE COVOITURAGE'}
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
    scroll: { paddingHorizontal: Layout.gutter, paddingTop: 12 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fieldLabel: {
      fontFamily: FONTS.mono, fontSize: 10, color: t.textMute,
      letterSpacing: 2, marginBottom: 8,
    },
    addressHint: { fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1, marginTop: 7 },
    addressHintValid: { color: '#22C55E' },
    dropdown: {
      height: 44, backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.md,
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
      borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md,
      marginTop: 4, overflow: 'hidden',
    },
    eventGroupLabel: {
      paddingHorizontal: 14, paddingVertical: 8, backgroundColor: t.surface,
      fontFamily: FONTS.mono, fontSize: 8, color: t.textMute, letterSpacing: 1.5,
    },
    emptyEvents: {
      padding: 18, textAlign: 'center', fontFamily: FONTS.mono,
      fontSize: 9, color: t.textMute, letterSpacing: 1,
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
      borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.md,
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
      borderRadius: Radii.md, overflow: 'hidden', alignSelf: 'flex-start',
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
      paddingHorizontal: Layout.gutter, paddingTop: 12, paddingBottom: 12,
      backgroundColor: t.ink, borderTopWidth: 1, borderTopColor: t.hairline,
    },
    ctaBtn: {
      height: 50, backgroundColor: t.crimson, borderRadius: Radii.md,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaBtnDisabled: { backgroundColor: t.elevated },
    ctaBtnText: {
      fontFamily: FONTS.display, fontSize: 13, color: t.onAccent,
      fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    },
  });
}
