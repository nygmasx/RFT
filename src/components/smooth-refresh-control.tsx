import { RefreshControl } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
  progressViewOffset?: number;
};

/** Consistent native pull gesture and a compact club-coloured indicator. */
export function SmoothRefreshControl({ refreshing, onRefresh, progressViewOffset = 8 }: Props) {
  const { theme } = useTheme();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.crimson}
      colors={[theme.crimson]}
      progressBackgroundColor={theme.surface}
      progressViewOffset={progressViewOffset}
      title=""
      titleColor={theme.textMute}
    />
  );
}
