const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

// Never let a store build silently call the phone itself when an EAS variable is
// missing. Localhost remains convenient for development, while release builds
// have a safe production fallback.
export const API_BASE_URL = (
  configuredApiUrl || (__DEV__ ? 'http://localhost:3001' : 'https://rfteam.fly.dev')
).replace(/\/$/, '');
