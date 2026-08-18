import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { MentionableMember, Message } from '@/lib/database.types';

export function useMessages(channelId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [members, setMembers] = useState<MentionableMember[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    try {
      const rows = await api.get<Message[]>(`/api/messages/${channelId}`);
      setMessages(rows ?? []);
    } catch (e: any) {
      console.error('[useMessages]', e.message);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  const fetchMembers = useCallback(async () => {
    if (!channelId) return;
    try {
      setMembers(await api.get<MentionableMember[]>(`/api/messages/${channelId}/members`) ?? []);
    } catch (e: any) {
      console.error('[useMessages:members]', e.message);
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;
    const initialFetch = setTimeout(fetchMessages, 0);
    const memberFetch = setTimeout(fetchMembers, 0);
    // Poll every 3s for new messages
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      clearTimeout(initialFetch);
      clearTimeout(memberFetch);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [channelId, fetchMembers, fetchMessages]);

  const sendMessage = async (body: string, mentionUserIds: string[] = []) => {
    if (!user || !body.trim()) return;
    const msg = await api.post<Message>(`/api/messages/${channelId}`, { body, mention_user_ids: mentionUserIds });
    setMessages((prev) => [...prev, msg]);
  };

  const sendMedia = async (payload: { data_url: string; file_name?: string; duration_ms?: number; caption?: string; mention_user_ids?: string[] }) => {
    if (!user) return;
    const msg = await api.post<Message>(`/api/messages/${channelId}/media`, payload);
    setMessages((prev) => [...prev, msg]);
  };

  const deleteMessage = async (id: string) => {
    await api.delete(`/api/messages/item/${id}`);
    setMessages((current) => current.filter((message) => message.id !== id));
  };

  return { messages, members, loading, sendMessage, sendMedia, deleteMessage, refetch: fetchMessages, currentUserId: user?.id };
}
