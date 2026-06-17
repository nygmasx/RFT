import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Ionicons } from '@expo/vector-icons';

import { FONTS, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const days = getCalendarDays(year, month);

  const eventsForDay = (day: number | null): CalendarEvent[] => {
    if (day === null) return [];
    const key = dateKey(year, month, day);
    return calendarEvents.filter((e) => e.eventDate === key);
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
    setNewTitle(''); setNewType('cours'); setNewTime(null); setNewPlace('');
    setSaveError('');
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!newTitle.trim()) { setSaveError('Titre requis.'); return; }
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
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerLabel}>CALENDRIER</Text>
          {isCoach ? (
            <Pressable style={styles.addBtn} onPress={openCreate}>
              <Text style={styles.addBtnText}>＋</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <Pressable onPress={goToPrevMonth} style={styles.navBtn}>
            <Text style={styles.navIcon}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
          <Pressable onPress={goToNextMonth} style={styles.navBtn}>
            <Text style={styles.navIcon}>›</Text>
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

        {/* Coach: create form */}
        {isCoach && showCreate && (
          <View style={styles.createForm}>
            <View style={styles.createFormHeader}>
              <Text style={styles.createFormTitle}>NOUVEL ÉVÉNEMENT</Text>
              <Pressable onPress={() => setShowCreate(false)}>
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
              <TextInput style={styles.input} value={newPlace} onChangeText={setNewPlace}
                placeholder="Tatami 2" placeholderTextColor={t.textMute} selectionColor={t.crimson} />
            </View>

            {!!saveError && <Text style={{ color: t.crimson, fontSize: 12, marginTop: 8 }}>{saveError}</Text>}

            <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveBtnText}>ENREGISTRER</Text>
              }
            </Pressable>
          </View>
        )}

        <View style={styles.divider} />

        {/* Events for selected day */}
        {selectedDay !== null && (
          <View style={styles.daySection}>
            <Text style={styles.daySectionLabel}>
              {selectedDay} {MONTH_NAMES[month]}
            </Text>

            {selectedEvents.length === 0 ? (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyDayText}>Aucun événement ce jour</Text>
              </View>
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
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>Sélectionnez un jour pour voir les événements</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    headerLabel: {
      flex: 1, textAlign: 'center',
      fontFamily: FONTS.display, fontSize: 14, color: t.bone,
      fontWeight: '900', letterSpacing: 2,
    },
    headerSpacer: { width: 36 },
    addBtn: {
      width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.crimson, borderRadius: 3,
    },
    addBtnText: { fontSize: 20, color: '#FFF', lineHeight: 24 },

    scroll: { paddingBottom: 20 },
    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 24, paddingVertical: 16,
    },
    navBtn: {
      width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
    },
    navIcon: { fontSize: 24, color: t.bone, lineHeight: 28 },
    monthLabel: {
      fontFamily: FONTS.display, fontSize: 18, color: t.bone,
      fontWeight: '900', letterSpacing: 2,
    },
    dayHeaders: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
    dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    dayHeaderText: { fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5 },
    gridRow: { flexDirection: 'row', paddingHorizontal: 12 },
    dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 48 },
    dayNumber: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    dayNumberSelected: { backgroundColor: t.crimson },
    dayNumberToday: { borderWidth: 1, borderColor: t.crimson },
    dayText: { fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '500' },
    dayTextSelected: { color: t.bone, fontWeight: '700' },
    dayTextToday: { color: t.crimson, fontWeight: '700' },
    dots: { flexDirection: 'row', gap: 2, marginTop: 2, justifyContent: 'center', minHeight: 7 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
    legend: {
      flexDirection: 'row', gap: 16, paddingHorizontal: 20, paddingVertical: 12,
      justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5 },

    // Coach create form
    createForm: {
      marginHorizontal: 20, marginBottom: 12,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline,
      borderRadius: 3, padding: 14,
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
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 3,
      borderWidth: 1, borderColor: t.hairlineStrong,
    },
    typeChipText: { fontFamily: FONTS.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    saveBtn: {
      backgroundColor: t.crimson, borderRadius: 3, paddingVertical: 13,
      alignItems: 'center', marginTop: 14,
    },
    saveBtnText: { fontFamily: FONTS.mono, fontSize: 12, color: '#FFF', fontWeight: '700', letterSpacing: 1.5 },

    divider: { height: 1, backgroundColor: t.hairline, marginHorizontal: 20 },
    daySection: { paddingHorizontal: 20, paddingTop: 16 },
    daySectionLabel: {
      fontFamily: FONTS.display, fontSize: 16, color: t.bone,
      fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
    },
    eventList: { gap: 10 },
    eventRow: {
      flexDirection: 'row', backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3, overflow: 'hidden',
    },
    eventBorder: { width: 4 },
    eventContent: { flex: 1, padding: 12 },
    eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    eventTime: { fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, letterSpacing: 1 },
    eventTag: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderRadius: 2 },
    eventTagText: { fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '600', letterSpacing: 1 },
    eventTitle: { fontFamily: FONTS.body, fontSize: 13.5, color: t.bone, fontWeight: '600', marginBottom: 3 },
    eventPlaceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    eventPlace: { fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim },
    emptyDay: { paddingHorizontal: 20, paddingTop: 16, alignItems: 'center' },
    emptyDayText: { fontFamily: FONTS.body, fontSize: 13, color: t.textMute, fontStyle: 'italic' },
  });
}
