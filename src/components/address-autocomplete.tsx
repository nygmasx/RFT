import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

export type AddressSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
  postcode?: string;
  city?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
};

export function AddressAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const { theme: t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 3) return;
    const currentRequest = ++requestId.current;
    const timeout = setTimeout(() => {
      setLoading(true);
      api.get<{ suggestions: AddressSuggestion[] }>(`/api/geolocation/search?q=${encodeURIComponent(query)}`)
        .then((result) => {
          if (requestId.current === currentRequest) setSuggestions(result.suggestions ?? []);
        })
        .catch(() => {
          if (requestId.current === currentRequest) setSuggestions([]);
        })
        .finally(() => {
          if (requestId.current === currentRequest) setLoading(false);
        });
    }, 280);
    return () => clearTimeout(timeout);
  }, [focused, value]);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <Ionicons name="location-outline" size={18} color={focused ? t.crimson : t.textMute} />
        <TextInput
          accessibilityLabel="Adresse"
          autoCapitalize="words"
          autoCorrect={false}
          onBlur={() => setTimeout(() => {
            requestId.current += 1;
            setFocused(false);
            setSuggestions([]);
            setLoading(false);
          }, 160)}
          onChangeText={(next) => {
            requestId.current += 1;
            onChange(next);
            setFocused(true);
            setSuggestions([]);
            setLoading(false);
          }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder ?? 'Saisir une adresse…'}
          placeholderTextColor={t.textMute}
          returnKeyType="search"
          style={styles.input}
          value={value}
        />
        {loading && <ActivityIndicator color={t.crimson} size="small" />}
      </View>

      {focused && suggestions.length > 0 && (
        <View style={styles.results}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={`${suggestion.longitude}-${suggestion.latitude}-${index}`}
              onPress={() => {
                requestId.current += 1;
                onSelect(suggestion);
                setSuggestions([]);
                setFocused(false);
              }}
              style={[styles.result, index > 0 && styles.resultBorder]}
            >
              <Ionicons name="navigate-outline" size={16} color={t.crimson} />
              <View style={styles.resultText}>
                <Text numberOfLines={2} style={styles.resultLabel}>{suggestion.label}</Text>
                {!!suggestion.city && <Text style={styles.resultCity}>{suggestion.city}</Text>}
              </View>
            </Pressable>
          ))}
          <Text style={styles.attribution}>ADRESSE · GÉOPLATEFORME IGN</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 20 },
  inputWrap: {
    minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 3,
  },
  inputWrapFocused: { borderColor: t.crimson },
  input: { flex: 1, paddingVertical: 12, color: t.bone, fontFamily: FONTS.body, fontSize: 14 },
  results: {
    position: 'absolute', top: 51, left: 0, right: 0, zIndex: 50,
    backgroundColor: t.elevated, borderWidth: 1, borderColor: t.hairlineStrong,
    borderRadius: 3, overflow: 'hidden',
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  resultBorder: { borderTopWidth: 1, borderTopColor: t.hairline },
  resultText: { flex: 1 },
  resultLabel: { color: t.bone, fontFamily: FONTS.body, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  resultCity: { color: t.textMute, fontFamily: FONTS.body, fontSize: 10.5, marginTop: 2 },
  attribution: {
    color: t.textMute, backgroundColor: t.surface, fontFamily: FONTS.mono,
    fontSize: 7.5, letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 6,
  },
});
