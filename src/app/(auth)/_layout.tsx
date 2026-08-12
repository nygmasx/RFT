import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout() {
  const { user } = useAuth();
  const isPending = Boolean(user && user.status !== 'approved' && user.role !== 'coach' && user.role !== 'admin');

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={isPending}>
        <Stack.Screen name="pending" />
      </Stack.Protected>
    </Stack>
  );
}
