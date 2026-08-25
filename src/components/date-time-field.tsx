import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import DateTimePicker from '@/components/themed-date-time-picker';
import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type DateTimeFieldProps = {
  label: string;
  mode: 'date' | 'time';
  value: Date | null;
  onChange: (value: Date | null) => void;
  optional?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

function formatValue(value: Date | null, mode: DateTimeFieldProps['mode']) {
  if (!value) return mode === 'date' ? 'Sélectionner une date' : 'Sélectionner une heure';
  if (mode === 'time') {
    return value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return value.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

export function DateTimeField({ label, mode, value, onChange, optional, minimumDate, maximumDate }: DateTimeFieldProps) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [open, setOpen] = useState(false);
  const pickerValue = value ?? new Date();

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional && value ? (
          <Pressable accessibilityLabel={`Effacer ${label.toLowerCase()}`} hitSlop={8} onPress={() => onChange(null)}>
            <Text style={styles.clear}>EFFACER</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatValue(value, mode)}`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.control, open && styles.controlOpen, pressed && styles.pressed]}
        onPress={() => setOpen((current) => !current)}
      >
        <View style={styles.icon}>
          <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={t.crimson} />
        </View>
        <Text numberOfLines={1} style={[styles.value, !value && styles.placeholder]}>{formatValue(value, mode)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={t.textMute} />
      </Pressable>
      {open ? (
        <View style={styles.pickerShell}>
          <DateTimePicker
            value={pickerValue}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="fr-FR"
            is24Hour
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_, selected) => {
              if (Platform.OS !== 'ios') setOpen(false);
              onChange(selected);
            }}
            onDismiss={() => setOpen(false)}
          />
          {Platform.OS === 'ios' ? (
            <Pressable accessibilityRole="button" style={styles.done} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>TERMINÉ</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    field: { flex: 1, minWidth: 0, marginBottom: 12 },
    labelRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    label: { color: t.textMute, fontFamily: FONTS.mono, fontSize: 8, letterSpacing: 1.3 },
    clear: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
    control: { minHeight: Layout.touchTarget + 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: t.hairlineStrong, borderRadius: Radii.md, backgroundColor: t.ink },
    controlOpen: { borderColor: t.crimson },
    icon: { width: 30, height: 30, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson + '12' },
    value: { flex: 1, color: t.bone, fontSize: 12.5, textTransform: 'capitalize' },
    placeholder: { color: t.textMute },
    pressed: { opacity: 0.76 },
    pickerShell: { marginTop: 8, padding: 8, borderRadius: Radii.md, borderWidth: 1, borderColor: t.hairline, backgroundColor: t.surface, overflow: 'hidden' },
    done: { minHeight: Layout.touchTarget, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: t.hairline },
    doneText: { color: t.crimson, fontFamily: FONTS.mono, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  });
}
