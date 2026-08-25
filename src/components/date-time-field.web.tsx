import { Ionicons } from '@expo/vector-icons';
import { ChangeEvent, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

const pad = (value: number) => String(value).padStart(2, '0');
const serialize = (value: Date | null, mode: DateTimeFieldProps['mode']) => {
  if (!value) return '';
  return mode === 'date'
    ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

export function DateTimeField({ label, mode, value, onChange, optional, minimumDate, maximumDate }: DateTimeFieldProps) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!next) return onChange(null);
    if (mode === 'date') {
      const [year, month, day] = next.split('-').map(Number);
      onChange(new Date(year, month - 1, day, 12));
    } else {
      const [hours, minutes] = next.split(':').map(Number);
      const nextDate = value ? new Date(value) : new Date();
      nextDate.setHours(hours, minutes, 0, 0);
      onChange(nextDate);
    }
  };

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional && value ? <Pressable onPress={() => onChange(null)}><Text style={styles.clear}>EFFACER</Text></Pressable> : null}
      </View>
      <View style={styles.control}>
        <View style={styles.icon}><Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={t.crimson} /></View>
        <input
          aria-label={label}
          type={mode}
          value={serialize(value, mode)}
          min={serialize(minimumDate ?? null, mode)}
          max={serialize(maximumDate ?? null, mode)}
          onChange={handleChange}
          style={{ flex: 1, minWidth: 0, height: Layout.touchTarget, color: t.bone, background: 'transparent', border: 0, outline: 'none', fontSize: 13, colorScheme: t.ink === '#F5F2ED' ? 'light' : 'dark' }}
        />
      </View>
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
    icon: { width: 30, height: 30, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: t.crimson + '12' },
  });
}
