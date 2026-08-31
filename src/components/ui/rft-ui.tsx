import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, ReactNode, useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { FONTS, Layout, Radii, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';

type IconName = keyof typeof Ionicons.glyphMap;

export function ScreenHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeading}>
        <Text allowFontScaling style={styles.eyebrow}>{eyebrow}</Text>
        <Text
          adjustsFontSizeToFit
          allowFontScaling
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.screenTitle}
        >
          {title}
        </Text>
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  badge = false,
  accent = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: boolean;
  accent?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        accent && styles.iconButtonAccent,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={accent ? theme.onAccent : theme.bone} />
      {badge ? <View style={styles.iconBadge} /> : null}
    </Pressable>
  );
}

export function DetailHeader({
  title,
  eyebrow,
  onBack,
  action,
}: {
  title: string;
  eyebrow?: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.detailHeader}>
      <Pressable
        accessibilityLabel="Retour"
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => {
          haptics.selection();
          onBack();
        }}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={21} color={theme.bone} />
      </Pressable>
      <View style={styles.detailHeading}>
        {eyebrow ? <Text style={styles.detailEyebrow}>{eyebrow}</Text> : null}
        <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.detailTitle}>{title}</Text>
      </View>
      <View style={styles.detailAction}>{action}</View>
    </View>
  );
}

export function Surface({
  children,
  style,
  accent,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; accent?: 'crimson' | 'gold' }>) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      style={[
        styles.surface,
        accent === 'crimson' && styles.surfaceCrimson,
        accent === 'gold' && styles.surfaceGold,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Chip({
  label,
  tone = 'accent',
  filled = false,
}: {
  label: string;
  tone?: 'accent' | 'gold' | 'muted' | 'success' | 'warning' | 'info';
  filled?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colors = {
    accent: theme.crimson,
    gold: theme.gold,
    muted: theme.textDim,
    success: theme.success,
    warning: theme.warning,
    info: theme.info,
  };
  const color = colors[tone];

  return (
    <View style={[styles.chip, { borderColor: `${color}66`, backgroundColor: filled ? color : `${color}12` }]}>
      <Text style={[styles.chipText, { color: filled ? theme.onAccent : color }]}>{label}</Text>
    </View>
  );
}

export function SectionHeading({
  title,
  meta,
  actionLabel,
  onAction,
}: {
  title: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionCopy}>
        <Text allowFontScaling style={styles.sectionTitle}>{title}</Text>
        {meta ? <Text allowFontScaling style={styles.sectionMeta}>{meta}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.crimson} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SegmentedControl({
  items,
  selectedIndex,
  onChange,
}: {
  items: readonly string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View accessibilityRole="tablist" style={styles.segmented}>
      {items.map((item, index) => {
        const selected = selectedIndex === index;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item}
            onPress={() => {
              haptics.selection();
              onChange(index);
            }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text numberOfLines={1} style={[styles.segmentText, selected && styles.segmentTextSelected]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Surface style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={24} color={theme.crimson} /></View>
      <Text allowFontScaling style={styles.emptyTitle}>{title}</Text>
      <Text allowFontScaling style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
        >
          <Text style={styles.emptyButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Surface>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screenHeader: {
      minHeight: 96,
      paddingHorizontal: Layout.gutter,
      paddingTop: 8,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    screenHeading: { flex: 1, minWidth: 0 },
    eyebrow: {
      color: theme.crimson,
      fontFamily: FONTS.mono,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.8,
      textTransform: 'uppercase',
    },
    screenTitle: {
      color: theme.bone,
      fontFamily: FONTS.display,
      fontSize: 40,
      fontWeight: '900',
      letterSpacing: -1.2,
      lineHeight: 44,
      marginTop: 2,
    },
    headerAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconButton: {
      width: Layout.touchTarget,
      height: Layout.touchTarget,
      borderRadius: Radii.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.elevated,
      borderWidth: 1,
      borderColor: theme.hairlineStrong,
    },
    iconButtonAccent: { backgroundColor: theme.crimson, borderColor: theme.crimson },
    iconBadge: {
      position: 'absolute',
      right: 7,
      top: 7,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.crimson,
      borderWidth: 2,
      borderColor: theme.elevated,
    },
    detailHeader: {
      minHeight: 66,
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailHeading: { flex: 1, minWidth: 0 },
    detailEyebrow: {
      color: theme.crimson,
      fontFamily: FONTS.mono,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    detailTitle: { color: theme.bone, fontFamily: FONTS.display, fontSize: 18, fontWeight: '900' },
    detailAction: { width: Layout.touchTarget, minHeight: Layout.touchTarget, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
    surface: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.hairline,
      borderRadius: Radii.md,
    },
    surfaceCrimson: { borderColor: `${theme.crimson}66` },
    surfaceGold: { borderColor: `${theme.gold}66` },
    chip: {
      minHeight: 24,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderWidth: 1,
      borderRadius: Radii.round,
      alignSelf: 'flex-start',
      justifyContent: 'center',
    },
    chipText: {
      fontFamily: FONTS.mono,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    sectionHeading: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionCopy: { flex: 1, minWidth: 0 },
    sectionTitle: {
      color: theme.bone,
      fontFamily: FONTS.display,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    sectionMeta: { color: theme.textMute, fontSize: 11, marginTop: 2 },
    sectionAction: {
      minHeight: Layout.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    sectionActionText: {
      color: theme.crimson,
      fontFamily: FONTS.mono,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    segmented: {
      flexDirection: 'row',
      padding: 4,
      marginHorizontal: Layout.gutter,
      backgroundColor: theme.surface,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.hairline,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.sm,
    },
    segmentSelected: { backgroundColor: theme.elevated },
    segmentText: { color: theme.textMute, fontSize: 11, fontWeight: '700' },
    segmentTextSelected: { color: theme.bone },
    emptyState: { padding: 28, alignItems: 'center' },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${theme.crimson}16`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: theme.bone,
      fontFamily: FONTS.display,
      fontSize: 17,
      fontWeight: '900',
      marginTop: 14,
      textAlign: 'center',
    },
    emptyMessage: { color: theme.textDim, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
    emptyButton: {
      minHeight: Layout.touchTarget,
      marginTop: 18,
      paddingHorizontal: 18,
      borderRadius: Radii.round,
      backgroundColor: theme.crimson,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyButtonText: { color: theme.onAccent, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  });
}
