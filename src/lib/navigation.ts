import { Href, router } from 'expo-router';

/** Return to navigation history, with a deterministic fallback for deep links. */
export function safeBack(fallback: Href = '/(tabs)/accueil') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
