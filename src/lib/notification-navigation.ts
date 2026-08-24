import type { Href } from 'expo-router';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function notificationHref(data: Record<string, unknown>): Href | null {
  const channelId = stringValue(data.channelId);
  const channelName = stringValue(data.channelName);
  const messageId = stringValue(data.messageId);
  const announcementId = stringValue(data.announcementId);
  const competitionId = stringValue(data.competitionId);
  const screen = stringValue(data.screen);

  if (screen === 'add_result') {
    return { pathname: '/add-result', params: competitionId ? { competitionId } : {} };
  }
  if (screen === 'admin_results') {
    return { pathname: '/admin-results', params: competitionId ? { competitionId } : {} };
  }
  if (channelId) {
    return {
      pathname: '/chat',
      params: {
        channel: channelId,
        name: channelName ?? 'Salon',
        ...(messageId ? { message: messageId } : {}),
      },
    };
  }
  if (announcementId) return { pathname: '/announcement', params: { id: announcementId } };
  if (competitionId) return { pathname: '/competition-detail', params: { id: competitionId } };
  if (stringValue(data.calendarEventId)) return '/calendar';
  if (stringValue(data.carpoolId)) return '/(tabs)/covoiturage';
  return '/notifications';
}
