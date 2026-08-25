import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { FONTS, Radii, Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';

const TAB_CONFIG = [
  { name: 'accueil',      label: 'Accueil',      ios: 'house.fill',        android: 'home',          web: 'home' },
  { name: 'salons',       label: 'Salons',        ios: 'bubble.left.fill',  android: 'chat',          web: 'chat' },
  { name: 'competitions', label: 'Compétitions',  ios: 'trophy.fill',       android: 'emoji_events',  web: 'emoji_events' },
  { name: 'covoiturage',  label: 'Covoit.',       ios: 'car.fill',          android: 'directions_car',web: 'directions_car' },
  { name: 'profil',       label: 'Profil',        ios: 'person.fill',       android: 'person',        web: 'person' },
] as const;

function RFTTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const tab = TAB_CONFIG.find((item) => item.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const color = focused ? t.bone : t.textMute;
          const label = isCoach && tab.name === 'accueil' ? 'Pilotage' : tab.label;

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              hitSlop={{ top: 4, bottom: 4 }}
              key={route.key}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
              onPress={() => {
                if (!focused) haptics.selection();
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <SymbolView
                  name={{ ios: tab.ios, android: tab.android, web: tab.web }}
                  tintColor={color}
                  size={focused ? 21 : 20}
                />
              </View>
              <Text allowFontScaling numberOfLines={1} style={[styles.tabLabel, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      tabBar={(props) => <RFTTabBar state={props.state} navigation={props.navigation} />}
    >
      <Tabs.Screen name="accueil" />
      <Tabs.Screen name="salons" />
      <Tabs.Screen name="competitions" />
      <Tabs.Screen name="covoiturage" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    tabBarOuter: {
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: t.ink,
    },
    tabBar: {
      flexDirection: 'row',
      minHeight: 66,
      paddingHorizontal: 5,
      paddingVertical: 6,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.hairlineStrong,
      borderRadius: Radii.lg,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minHeight: 52,
    },
    tabPressed: { opacity: 0.68 },
    iconWrap: {
      width: 38,
      height: 29,
      borderRadius: Radii.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapActive: { backgroundColor: t.crimson },
    tabLabel: {
      fontFamily: FONTS.body,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: -0.1,
    },
  });
}
