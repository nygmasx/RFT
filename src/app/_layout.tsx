import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function PushNotificationRegistrar() {
  const { user } = useAuth();
  usePushNotifications(user?.id);
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PushNotificationRegistrar />
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
            animation: 'slide_from_right',
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
