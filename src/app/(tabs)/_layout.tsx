import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

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
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 10 }]}>
      {state.routes.map((route: any, index: number) => {
        const tab = TAB_CONFIG.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? t.crimson : t.textMute;

        return (
          <Pressable
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            <SymbolView
              name={{ ios: tab.ios, android: tab.android, web: tab.web }}
              tintColor={color}
              size={22}
            />
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}

      {/* iOS home indicator pill */}
      {Platform.OS === 'ios' && (
        <View style={styles.homeIndicator} />
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
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
    tabBar: {
      flexDirection: 'row',
      backgroundColor: t.ink,
      borderTopWidth: 1,
      borderTopColor: t.hairline,
      paddingTop: 10,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
    },
    tabLabel: {
      fontFamily: FONTS.body,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    homeIndicator: {
      position: 'absolute',
      bottom: 8,
      alignSelf: 'center',
      left: '50%',
      marginLeft: -67,
      width: 134,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.bone,
      opacity: 0.4,
    },
  });
}
