import { Redirect } from 'expo-router';

/**
 * Legacy Expo starter route kept for backwards-compatible deep links.
 * The product navigation now lives under the authenticated RFT tabs.
 */
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)/accueil" />;
}
