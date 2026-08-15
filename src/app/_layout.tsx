import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function PushNotificationRegistrar() {
  const { user } = useAuth();
  usePushNotifications(user?.id);
  return null;
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
          <PushNotificationRegistrar />
          <StatusBar style="auto" />
          <RootNavigator />
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
