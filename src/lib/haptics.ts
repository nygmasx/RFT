import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type HapticTask = () => Promise<void>;

function fire(task: HapticTask) {
  if (Platform.OS === 'web') return;
  void task().catch(() => {
    // Haptics are a progressive enhancement and should never block an action.
  });
}

export const haptics = {
  selection: () => fire(() => Haptics.selectionAsync()),
  light: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  rigid: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
