import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { FormScrollView } from '@/components/form-scroll-view';
import DateTimePicker from '@/components/themed-date-time-picker';
import { AddressAutocomplete, AddressSuggestion } from '@/components/address-autocomplete';
import { DetailHeader, EmptyState, IconButton, SectionHeading } from '@/components/ui/rft-ui';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { safeBack } from '@/lib/navigation';
import { CalendarEvent } from '@/lib/database.types';
import { api } from '@/lib/api';

const MONTH_NAMES = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE',
];

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type EventType = CalendarEvent['type'];

const EVT_COLORS: Record<EventType, string> = {
  cours: '#3B82F6', stage: '#C9A24B', compet: '#C8362D',
};
const EVT_LABELS: Record<EventType, string> = {
  cours: 'COURS', stage: 'STAGE', compet: 'COMPÉT.',
};
const EVT_TYPES: EventType[] = ['cours', 'stage', 'compet'];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${padTwo(month + 1)}-${padTwo(day)}`;
}

export default function CalendarScreen() {
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);

  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const { data: calendarEvents, refetch } = useCalendarEvents();

  const pad = (n: number) => String(n).padStart(2, '0');

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [newType, setNewType] = useState<EventType>('cours');
  const [newTime, setNewTime] = useState<Date | null>(null);
  const [newPlace, setNewPlace] = useState('');
  const [newPlacePoint, setNewPlacePoint] = useState<AddressSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const days = getCalendarDays(year, month);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of calendarEvents) {
      const current = grouped.get(event.eventDate);
      if (current) current.push(event);
      else grouped.set(event.eventDate, [event]);
    }
    return grouped;
  }, [calendarEvents]);

  const eventsForDay = (day: number | null): CalendarEvent[] => {
    if (day === null) return [];
    const key = dateKey(year, month, day);
    return eventsByDate.get(key) ?? [];
  };

  const selectedEvents = selectedDay !== null ? eventsForDay(selectedDay) : [];

  const goToPrevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else { setMonth((m) => m - 1); }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else { setMonth((m) => m + 1); }
    setSelectedDay(null);
  };

  const openCreate = () => {
    const prefilled = selectedDay !== null
      ? new Date(year, month, selectedDay)
      : new Date();
    setNewDate(prefilled);
    setNewTitle(''); setNewType('cours'); setNewTime(null); setNewPlace(''); setNewPlacePoint(null);
    setSaveError('');
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!newTitle.trim()) { setSaveError('Titre requis.'); return; }
    if (newType === 'compet' && newPlace.trim() && !newPlacePoint) {
      setSaveError('Sélectionne l’adresse de la compétition dans la liste.'); return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const dateStr = `${newDate.getFullYear()}-${pad(newDate.getMonth() + 1)}-${pad(newDate.getDate())}`;
      const timeStr = newTime ? `${pad(newTime.getHours())}:${pad(newTime.getMinutes())}` : null;
      await api.post('/api/calendar', {
        title: newTitle.trim(),
        event_date: dateStr,
        type: newType,
        event_time: timeStr,
        place: newPlace.trim() || null,
        latitude: newPlacePoint?.latitude ?? null,
        longitude: newPlacePoint?.longitude ?? null,
      });
      setShowCreate(false);
      refetch();
    } catch (e: any) {
      setSaveError(e.message);
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <DetailHeader
          eyebrow="Agenda du club"
          title="CALENDRIER"
          onBack={() => safeBack('/(tabs)/accueil')}
          action={isCoach ? <IconButton accent icon="add" label="Créer un événement" onPress={openCreate} /> : undefined}
        />
      </SafeAreaView>

      <FormScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.calendarCard}>
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <Pressable accessibilityLabel="Mois précédent" accessibilityRole="button" hitSlop={6} onPress={goToPrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={19} color={t.bone} />
            </Pressable>
            <View style={styles.monthCopy}>
              <Text style={styles.monthKicker}>{String(month + 1).padStart(2, '0')} · {year}</Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.monthLabel}>{MONTH_NAMES[month]}</Text>
            </View>
            <Pressable accessibilityLabel="Mois suivant" accessibilityRole="button" hitSlop={6} onPress={goToNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={19} color={t.bone} />
            </Pressable>
          </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAY_HEADERS.map((d, i) => (
            <View key={i} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid — explicit rows of 7 to avoid float% misalignment */}
        {Array.from({ length: days.length / 7 }, (_, wi) => (
          <View key={wi} style={styles.gridRow}>
            {days.slice(wi * 7, wi * 7 + 7).map((day, ci) => {
              const events = eventsForDay(day);
              const isSelected = day !== null && day === selectedDay;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <Pressable
                  key={ci}
                  style={styles.dayCell}
                  onPress={() => day !== null && setSelectedDay(day)}
                  disabled={day === null}
                >
                  {day !== null && (
                    <>
                      <View style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelected,
                        isToday && !isSelected && styles.dayNumberToday,
                      ]}>
                        <Text style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                          isToday && !isSelected && styles.dayTextToday,
                        ]}>
                          {day}
                        </Text>
                      </View>
                      {events.length > 0 && (
                        <View style={styles.dots}>
                          {events.slice(0, 3).map((e, ei) => (
                            <View key={ei} style={[styles.dot, { backgroundColor: EVT_COLORS[e.type as EventType] }]} />
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

          {/* Legend */}
          <View style={styles.legend}>
            {(Object.entries(EVT_LABELS) as [EventType, string][]).map(([type, label]) => (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: EVT_COLORS[type] }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Coach: create form */}
        {isCoach && showCreate && (
          <View style={styles.createForm}>
            <View style={styles.createFormHeader}>
              <Text style={styles.createFormTitle}>NOUVEL ÉVÉNEMENT</Text>
              <Pressable accessibilityLabel="Fermer le formulaire" accessibilityRole="button" hitSlop={10} onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={20} color={t.textMute} />
              </Pressable>
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>TITRE</Text>
              <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle}
                placeholder="Cours adultes — No-Gi" placeholderTextColor={t.textMute}
                selectionColor={t.crimson} />
            </View>
            <View style={styles.formDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <Pressable onPress={() => setShowDatePicker(true)}>
                <Text style={styles.input}>
                  {newDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={newDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale="fr-FR"
                  onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setNewDate(d); }}
                />
              )}
            </View>
            <View style={styles.formDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>TYPE</Text>
              <View style={styles.typeRow}>
                {EVT_TYPES.map((et) => (
                  <Pressable
                    key={et}
                    style={[styles.typeChip, newType === et && {
                      backgroundColor: EVT_COLORS[et] + '22',
                      borderColor: EVT_COLORS[et],
                    }]}
                    onPress={() => setNewType(et)}
                  >
                    <Text style={[styles.typeChipText, { color: newType === et ? EVT_COLORS[et] : t.textMute }]}>
                      {EVT_LABELS[et]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.formDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>HEURE (OPTIONNEL)</Text>
              <Pressable onPress={() => setShowTimePicker(true)}>
                <Text style={[styles.input, !newTime && { color: t.textMute }]}>
                  {newTime ? `${pad(newTime.getHours())}:${pad(newTime.getMinutes())}` : 'Sélectionner une heure'}
                </Text>
              </Pressable>
              {showTimePicker && (
                <DateTimePicker
                  value={newTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour
                  onChange={(_, d) => { setShowTimePicker(Platform.OS === 'ios'); if (d) setNewTime(d); }}
                />
              )}
            </View>
            <View style={styles.formDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>LIEU</Text>
              {newType === 'compet' ? (
                <AddressAutocomplete
                  placeholder="Adresse complète de la compétition"
                  value={newPlace}
                  onChange={(value) => { setNewPlace(value); setNewPlacePoint(null); }}
                  onSelect={(suggestion) => { setNewPlace(suggestion.label); setNewPlacePoint(suggestion); }}
                />
              ) : (
                <TextInput style={styles.input} value={newPlace} onChangeText={(value) => { setNewPlace(value); setNewPlacePoint(null); }}
                  placeholder="Tatami 2" placeholderTextColor={t.textMute} selectionColor={t.crimson} />
              )}
            </View>

            {!!saveError && <Text style={{ color: t.crimson, fontSize: 12, marginTop: 8 }}>{saveError}</Text>}

            <Pressable accessibilityRole="button" style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveBtnText}>ENREGISTRER</Text>
              }
            </Pressable>
          </View>
        )}

        {/* Events for selected day */}
        {selectedDay !== null && (
          <View style={styles.daySection}>
            <SectionHeading
              title={`${selectedDay} ${MONTH_NAMES[month]}`}
              meta={`${selectedEvents.length} événement${selectedEvents.length > 1 ? 's' : ''}`}
            />

            {selectedEvents.length === 0 ? (
              <EmptyState icon="calendar-outline" title="Tatami libre" message="Aucun événement n’est prévu ce jour." />
            ) : (
              <View style={styles.eventList}>
                {selectedEvents.map((e) => (
                  <View key={e.id} style={styles.eventRow}>
                    <View style={[styles.eventBorder, { backgroundColor: EVT_COLORS[e.type] }]} />
                    <View style={styles.eventContent}>
                      <View style={styles.eventTop}>
                        <Text style={styles.eventTime}>{e.eventTime ?? ''}</Text>
                        <View style={[styles.eventTag, { borderColor: EVT_COLORS[e.type] }]}>
                          <Text style={[styles.eventTagText, { color: EVT_COLORS[e.type] }]}>
                            {EVT_LABELS[e.type]}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      {e.place ? (
                        <View style={styles.eventPlaceRow}>
                          <Ionicons name="location-outline" size={11} color={t.textDim} />
                          <Text style={styles.eventPlace}>{e.place}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {selectedDay === null && (
          <View style={styles.daySection}>
            <EmptyState icon="calendar-outline" title="Choisis une date" message="Sélectionne un jour pour afficher le programme du club." />
          </View>
        )}

        <View style={{ height: 40 }} />
      </FormScrollView>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ink },
    scroll: { paddingHorizontal: Layout.gutter, paddingBottom: 20, gap: 18 },
    calendarCard: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: Radii.lg, paddingBottom: 4, overflow: 'hidden',
    },
    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 16,
    },
    navBtn: {
      width: Layout.touchTarget, height: Layout.touchTarget, alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.round,
    },
    monthCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    monthKicker: { fontFamily: FONTS.mono, fontSize: 9, color: t.crimson, fontWeight: '800', letterSpacing: 1.5 },
    monthLabel: {
      fontFamily: FONTS.display, fontSize: 21, color: t.bone,
      fontWeight: '900', letterSpacing: 0.8, marginTop: 2,
    },
    dayHeaders: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 },
    dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    dayHeaderText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5 },
    gridRow: { flexDirection: 'row', paddingHorizontal: 8 },
    dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, minHeight: 50 },
    dayNumber: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    dayNumberSelected: { backgroundColor: t.crimson },
    dayNumberToday: { borderWidth: 1, borderColor: t.crimson },
    dayText: { fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '500' },
    dayTextSelected: { color: t.onAccent, fontWeight: '800' },
    dayTextToday: { color: t.crimson, fontWeight: '700' },
    dots: { flexDirection: 'row', gap: 2, marginTop: 2, justifyContent: 'center', minHeight: 7 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
    legend: {
      flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 14,
      justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5 },

    // Coach create form
    createForm: {
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: Radii.lg, padding: 16,
    },
    createFormHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    createFormTitle: { fontFamily: FONTS.mono, fontSize: 11, color: t.bone, letterSpacing: 2, fontWeight: '700' },
    fieldRow: { paddingVertical: 10 },
    fieldLabel: { fontFamily: FONTS.mono, fontSize: 9.5, color: t.textMute, letterSpacing: 1.5, marginBottom: 6 },
    input: { fontFamily: FONTS.body, fontSize: 15, color: t.bone, fontWeight: '500', paddingVertical: 0 },
    formDivider: { height: 1, backgroundColor: t.hairline, marginVertical: 2 },
    typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    typeChip: {
      minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.round,
      borderWidth: 1, borderColor: t.hairlineStrong,
    },
    typeChipText: { fontFamily: FONTS.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    saveBtn: {
      backgroundColor: t.crimson, borderRadius: Radii.md, minHeight: 48,
      alignItems: 'center', justifyContent: 'center', marginTop: 14,
    },
    saveBtnText: { fontFamily: FONTS.mono, fontSize: 12, color: t.onAccent, fontWeight: '700', letterSpacing: 1.5 },

    daySection: { gap: 12 },
    eventList: { gap: 10 },
    eventRow: {
      flexDirection: 'row', backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: Radii.md, overflow: 'hidden',
    },
    eventBorder: { width: 4 },
    eventContent: { flex: 1, padding: 12 },
    eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    eventTime: { fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, letterSpacing: 1 },
    eventTag: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderRadius: Radii.round },
    eventTagText: { fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '600', letterSpacing: 1 },
    eventTitle: { fontFamily: FONTS.body, fontSize: 13.5, color: t.bone, fontWeight: '600', marginBottom: 3 },
    eventPlaceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    eventPlace: { fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim },
  });
}
