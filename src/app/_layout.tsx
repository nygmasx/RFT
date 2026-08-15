import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { InAppNotificationBanner } from '@/components/in-app-notification-banner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function PushNotificationRegistrar() {
  const { user } = useAuth();
  const {
    foregroundNotification,
    dismissForegroundNotification,
    openForegroundNotification,
  } = usePushNotifications(user?.id);

  if (!foregroundNotification) return null;

  return (
    <InAppNotificationBanner
      key={foregroundNotification.id}
      notification={foregroundNotification}
      onDismiss={dismissForegroundNotification}
      onPress={openForegroundNotification}
    />
  );
}

const PRIVATE_ROUTES = [
  '(tabs)',
  'add-result',
  'admin',
  'admin-content',
  'admin-timer',
  'announcement',
  'calendar',
  'chat',
  'competition-detail',
  'create-carpool',
  'create-channel',
  'edit-belt',
  'edit-profile',
  'explore',
  'legal',
  'mes-covoiturages',
  'mon-activite',
  'notifications',
  'palmares',
  'settings',
] as const;

function RootNavigator() {
  const { user, loading } = useAuth();
  const canAccessMemberArea = Boolean(
    user && (user.status === 'approved' || user.role === 'coach' || user.role === 'admin'),
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#C8362D" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0A' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!canAccessMemberArea}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={canAccessMemberArea}>
        {PRIVATE_ROUTES.map((name) => <Stack.Screen key={name} name={name} />)}
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <PushNotificationRegistrar />
        </AuthProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
});
