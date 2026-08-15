import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import type { ForegroundNotification } from '@/hooks/usePushNotifications';

type Props = {
  notification: ForegroundNotification;
  onDismiss: () => void;
  onPress: () => void;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

function notificationIcon(data: Record<string, unknown>): IconName {
  if (data.channelId) return 'chatbubble-ellipses';
  if (data.announcementId) return 'megaphone';
  if (data.competitionId) return 'trophy';
  if (data.calendarEventId) return 'calendar';
  if (data.carpoolId) return 'car';
  return 'notifications';
}

export function InAppNotificationBanner({ notification, onDismiss, onPress }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [translateY] = useState(() => new Animated.Value(-140));
  const [opacity] = useState(() => new Animated.Value(0));
  const hiding = useRef(false);

  const hide = useCallback((after?: () => void) => {
    if (hiding.current) return;
    hiding.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: -140, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onDismiss();
      after?.();
    });
  }, [onDismiss, opacity, translateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => hide(), 5_000);
    return () => clearTimeout(timer);
  }, [hide, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.position,
        { top: insets.top + 8, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${notification.title}. ${notification.body}`}
        onPress={() => hide(onPress)}
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={notificationIcon(notification.data)} size={20} color={theme.bone} />
        </View>

        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.appName}>RONIN FIGHT TEAM</Text>
            <Text style={styles.now}>MAINTENANT</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          {!!notification.body && (
            <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la notification"
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            hide();
          }}
          style={styles.close}
        >
          <Ionicons name="close" size={16} color={theme.textDim} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    position: {
      position: 'absolute',
      left: 12,
      right: 12,
      zIndex: 10_000,
      elevation: 30,
    },
    banner: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.hairlineStrong,
      borderLeftWidth: 4,
      borderLeftColor: theme.crimson,
      borderRadius: 14,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
    },
    bannerPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.crimson,
    },
    content: { flex: 1, gap: 2 },
    heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    appName: {
      flex: 1,
      fontFamily: FONTS.mono,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: theme.crimson,
    },
    now: {
      fontFamily: FONTS.mono,
      fontSize: 7,
      letterSpacing: 0.7,
      color: theme.textMute,
    },
    title: { fontFamily: FONTS.body, fontSize: 14, fontWeight: '700', color: theme.bone },
    body: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 16, color: theme.textDim },
    close: { alignSelf: 'flex-start', padding: 2 },
  });
}
