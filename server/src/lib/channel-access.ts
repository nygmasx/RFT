import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { channelMembers, channels } from '../db/schema';

export type ChannelAccess = {
  exists: boolean;
  allowed: boolean;
  isLocked: boolean;
};

export async function getChannelAccess(channelId: string, userId: string): Promise<ChannelAccess> {
  const [channel] = await db
    .select({ isPrivate: channels.isPrivate, isLocked: channels.isLocked })
    .from(channels)
    .where(eq(channels.id, channelId));

  if (!channel) return { exists: false, allowed: false, isLocked: false };
  if (!channel.isPrivate) return { exists: true, allowed: true, isLocked: channel.isLocked };

  const [membership] = await db
    .select({ userId: channelMembers.userId })
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
    .limit(1);

  return { exists: true, allowed: Boolean(membership), isLocked: channel.isLocked };
}
