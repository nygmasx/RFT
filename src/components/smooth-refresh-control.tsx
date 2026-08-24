import { RefreshControl } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
  progressViewOffset?: number;
};

/** Consistent native pull gesture and a compact club-coloured indicator. */
export function SmoothRefreshControl({ refreshing, onRefresh, progressViewOffset = 8 }: Props) {
  const { theme } = useTheme();

  const handleRefresh = () => {
    haptics.light();
    onRefresh();
  };

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={theme.crimson}
      colors={[theme.crimson]}
      progressBackgroundColor={theme.surface}
      progressViewOffset={progressViewOffset}
      title=""
      titleColor={theme.textMute}
    />
  );
}
