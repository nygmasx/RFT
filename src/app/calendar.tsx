import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { CALENDAR_EVENTS, CalendarEvent } from '@/data/rft-data';

const MONTH_NAMES = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE',
];

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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

function eventColor(type: CalendarEvent['type'], t: Theme): string {
  if (type === 'compet') return t.crimson;
  if (type === 'stage') return '#C9A24B';
  return '#3B82F6';
}

function eventTypeLabel(type: CalendarEvent['type']): string {
  if (type === 'compet') return 'COMPÉT.';
  if (type === 'stage') return 'STAGE';
  return 'COURS';
}

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${padTwo(month + 1)}-${padTwo(day)}`;
}

export default function CalendarScreen() {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(4); // 4 = May (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number | null>(28); // default May 28

  const days = getCalendarDays(year, month);

  const eventsForDay = (day: number | null): CalendarEvent[] => {
    if (day === null) return [];
    const key = dateKey(year, month, day);
    return CALENDAR_EVENTS.filter((e) => e.date === key);
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

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerLabel}>CALENDRIER</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <Pressable onPress={goToPrevMonth} style={styles.navBtn}>
            <Text style={styles.navIcon}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month]} {year}
          </Text>
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

        {/* Calendar grid */}
        <View style={styles.grid}>
          {days.map((day, i) => {
            const events = eventsForDay(day);
            const isSelected = day !== null && day === selectedDay;
            const hasEvents = events.length > 0;
            const isToday = day === 27 && month === 4 && year === 2026;

            return (
              <Pressable
                key={i}
                style={styles.dayCell}
                onPress={() => day !== null && setSelectedDay(day)}
                disabled={day === null}
              >
                {day !== null ? (
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
                    {hasEvents && (
                      <View style={styles.dots}>
                        {events.slice(0, 3).map((e, ei) => (
                          <View
                            key={ei}
                            style={[styles.dot, { backgroundColor: eventColor(e.type, t) }]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>COURS</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C9A24B' }]} />
            <Text style={styles.legendText}>STAGE</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: t.crimson }]} />
            <Text style={styles.legendText}>COMPÉT.</Text>
          </View>
        </View>

        {/* Divider */}
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
                    <View style={[styles.eventBorder, { backgroundColor: eventColor(e.type, t) }]} />
                    <View style={styles.eventContent}>
                      <View style={styles.eventTop}>
                        <Text style={styles.eventTime}>{e.time}</Text>
                        <View style={[styles.eventTag, { borderColor: eventColor(e.type, t) }]}>
                          <Text style={[styles.eventTagText, { color: eventColor(e.type, t) }]}>
                            {eventTypeLabel(e.type)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      <Text style={styles.eventPlace}>📍 {e.place}</Text>
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
      fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    },
    headerSpacer: { width: 36 },
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
      fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
    },
    dayHeaders: {
      flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4,
    },
    dayHeaderCell: {
      flex: 1, alignItems: 'center', paddingVertical: 4,
    },
    dayHeaderText: {
      fontFamily: FONTS.mono, fontSize: 10, color: t.textMute, letterSpacing: 1.5,
    },
    grid: {
      flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12,
    },
    dayCell: {
      width: `${100 / 7}%`,
      alignItems: 'center', paddingVertical: 4, minHeight: 48,
    },
    dayNumber: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    dayNumberSelected: {
      backgroundColor: t.crimson,
    },
    dayNumberToday: {
      borderWidth: 1, borderColor: t.crimson,
    },
    dayText: {
      fontFamily: FONTS.body, fontSize: 14, color: t.bone, fontWeight: '500',
    },
    dayTextSelected: {
      color: t.bone, fontWeight: '700',
    },
    dayTextToday: {
      color: t.crimson, fontWeight: '700',
    },
    dots: {
      flexDirection: 'row', gap: 2, marginTop: 2,
      justifyContent: 'center', minHeight: 7,
    },
    dot: {
      width: 5, height: 5, borderRadius: 2.5,
    },
    legend: {
      flexDirection: 'row', gap: 16, paddingHorizontal: 20, paddingVertical: 12,
      justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: {
      fontFamily: FONTS.mono, fontSize: 9, color: t.textMute, letterSpacing: 1.5,
    },
    divider: { height: 1, backgroundColor: t.hairline, marginHorizontal: 20 },
    daySection: { paddingHorizontal: 20, paddingTop: 16 },
    daySectionLabel: {
      fontFamily: FONTS.display, fontSize: 16, color: t.bone,
      fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 12,
    },
    eventList: { gap: 10 },
    eventRow: {
      flexDirection: 'row', backgroundColor: t.surface,
      borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
      overflow: 'hidden',
    },
    eventBorder: { width: 4 },
    eventContent: { flex: 1, padding: 12 },
    eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    eventTime: {
      fontFamily: FONTS.mono, fontSize: 11, color: t.textDim, letterSpacing: 1,
    },
    eventTag: {
      paddingHorizontal: 6, paddingVertical: 2,
      borderWidth: 1, borderRadius: 2,
    },
    eventTagText: {
      fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: '600', letterSpacing: 1,
    },
    eventTitle: {
      fontFamily: FONTS.body, fontSize: 13.5, color: t.bone,
      fontWeight: '600', marginBottom: 3,
    },
    eventPlace: {
      fontFamily: FONTS.body, fontSize: 11.5, color: t.textDim,
    },
    emptyDay: {
      paddingHorizontal: 20, paddingTop: 16,
      alignItems: 'center',
    },
    emptyDayText: {
      fontFamily: FONTS.body, fontSize: 13, color: t.textMute, fontStyle: 'italic',
    },
  });
}
