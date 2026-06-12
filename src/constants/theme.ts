import { Platform } from 'react-native';

export type ThemeKey = 'sumi' | 'light' | 'navy' | 'forest' | 'slate';

export type Theme = {
  ink: string;
  surface: string;
  elevated: string;
  hairline: string;
  hairlineStrong: string;
  bone: string;
  paper: string;
  text: string;
  textDim: string;
  textMute: string;
  crimson: string;
  crimsonDeep: string;
  gold: string;
};

export const THEMES: Record<ThemeKey, Theme> = {
  sumi: {
    ink: '#0A0A0A',
    surface: '#14110F',
    elevated: '#1E1A17',
    hairline: 'rgba(255,255,255,0.07)',
    hairlineStrong: 'rgba(255,255,255,0.14)',
    bone: '#F4F1EC',
    paper: '#EBE6DD',
    text: '#F4F1EC',
    textDim: '#9C968D',
    textMute: '#6B665E',
    crimson: '#C8362D',
    crimsonDeep: '#8E1F18',
    gold: '#C9A24B',
  },
  light: {
    ink: '#F5F2ED',
    surface: '#FFFFFF',
    elevated: '#EDE9E3',
    hairline: 'rgba(0,0,0,0.08)',
    hairlineStrong: 'rgba(0,0,0,0.15)',
    bone: '#1A1210',
    paper: '#EBE6DD',
    text: '#1A1210',
    textDim: '#5C564E',
    textMute: '#8E887F',
    crimson: '#C8362D',
    crimsonDeep: '#8E1F18',
    gold: '#C9A24B',
  },
  navy: {
    ink: '#080D1A',
    surface: '#0E1526',
    elevated: '#182035',
    hairline: 'rgba(255,255,255,0.07)',
    hairlineStrong: 'rgba(255,255,255,0.14)',
    bone: '#E8EEF8',
    paper: '#D4DCEE',
    text: '#E8EEF8',
    textDim: '#8A9AB8',
    textMute: '#5A6A88',
    crimson: '#C8362D',
    crimsonDeep: '#8E1F18',
    gold: '#C9A24B',
  },
  forest: {
    ink: '#080F0A',
    surface: '#0F1A11',
    elevated: '#1A2B1C',
    hairline: 'rgba(255,255,255,0.07)',
    hairlineStrong: 'rgba(255,255,255,0.14)',
    bone: '#E4EEE5',
    paper: '#D2E2D4',
    text: '#E4EEE5',
    textDim: '#7A9E7E',
    textMute: '#4A6E4E',
    crimson: '#C8362D',
    crimsonDeep: '#8E1F18',
    gold: '#C9A24B',
  },
  slate: {
    ink: '#0C0E10',
    surface: '#141820',
    elevated: '#1E2430',
    hairline: 'rgba(255,255,255,0.07)',
    hairlineStrong: 'rgba(255,255,255,0.14)',
    bone: '#E2E8F0',
    paper: '#CBD5E1',
    text: '#E2E8F0',
    textDim: '#7A8CA0',
    textMute: '#4A5C70',
    crimson: '#C8362D',
    crimsonDeep: '#8E1F18',
    gold: '#C9A24B',
  },
};

export const THEME_LABELS: Record<ThemeKey, string> = {
  sumi: 'Sumi',
  light: 'Clair',
  navy: 'Marine',
  forest: 'Forêt',
  slate: 'Ardoise',
};

// Legacy export for files not yet migrated
export const RFT = THEMES.sumi;

export const FONTS = {
  display: Platform.select({
    ios: undefined,
    android: 'sans-serif-black',
    default: undefined,
  }),
  body: undefined as string | undefined,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// Legacy export for existing components that import Fonts
export const Fonts = {
  sans: undefined as string | undefined,
  serif: 'serif' as string | undefined,
  rounded: undefined as string | undefined,
  mono: FONTS.mono,
};

// Legacy compatibility
export const Colors = {
  light: {
    text: RFT.text,
    background: RFT.ink,
    backgroundElement: RFT.elevated,
    backgroundSelected: RFT.surface,
    textSecondary: RFT.textDim,
  },
  dark: {
    text: RFT.text,
    background: RFT.ink,
    backgroundElement: RFT.elevated,
    backgroundSelected: RFT.surface,
    textSecondary: RFT.textDim,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
