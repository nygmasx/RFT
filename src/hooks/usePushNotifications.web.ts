/** Push notifications are native-only. Keep web rendering free of native listeners and warnings. */
export function usePushNotifications(_userId: string | undefined) {
  // The web app uses its persisted in-app notification inbox instead.
  return {
    foregroundNotification: null,
    dismissForegroundNotification: () => {},
    openForegroundNotification: () => {},
  };
}
