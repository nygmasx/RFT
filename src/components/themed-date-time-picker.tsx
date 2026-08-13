import NativeDateTimePicker from '@react-native-community/datetimepicker';
import { ComponentProps } from 'react';

import { useTheme } from '@/context/ThemeContext';

type Props = ComponentProps<typeof NativeDateTimePicker>;

export default function ThemedDateTimePicker(props: Props) {
  const { theme: t, themeKey } = useTheme();
  const isDarkTheme = themeKey !== 'light';

  return (
    <NativeDateTimePicker
      {...props}
      textColor={isDarkTheme ? '#FFFFFF' : t.text}
      themeVariant={isDarkTheme ? 'dark' : 'light'}
    />
  );
}
