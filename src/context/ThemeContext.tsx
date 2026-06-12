import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEMES, ThemeKey, Theme } from '@/constants/theme';

type ThemeContextType = {
  themeKey: ThemeKey;
  theme: Theme;
  setTheme: (key: ThemeKey) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  themeKey: 'sumi',
  theme: THEMES.sumi,
  setTheme: () => {},
});

const STORAGE_KEY = '@rft_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('sumi');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v: string | null) => {
      if (v && v in THEMES) setThemeKey(v as ThemeKey);
    });
  }, []);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeKey(key);
    AsyncStorage.setItem(STORAGE_KEY, key);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeKey, theme: THEMES[themeKey], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
