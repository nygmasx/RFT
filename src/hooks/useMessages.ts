import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { MentionableMember, Message, MessageReceiptDetails, MessageUnreadMarker } from '@/lib/database.types';

export function useMessages(channelId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [members, setMembers] = useState<MentionableMember[]>([]);
  const [unreadMarker, setUnreadMarker] = useState<MessageUnreadMarker | null>(null);
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

  const fetchUnreadMarker = useCallback(async () => {
    if (!channelId) return;
    try {
      setUnreadMarker(await api.get<MessageUnreadMarker>(`/api/messages/${channelId}/unread-marker`));
    } catch (e: any) {
      console.error('[useMessages:unread-marker]', e.message);
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;
    const initialFetch = setTimeout(() => {
      void fetchUnreadMarker().finally(fetchMessages);
    }, 0);
    const memberFetch = setTimeout(fetchMembers, 0);
    // Poll every 3s for new messages
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      clearTimeout(initialFetch);
      clearTimeout(memberFetch);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [channelId, fetchMembers, fetchMessages, fetchUnreadMarker]);

  const sendMessage = async (body: string, mentionUserIds: string[] = [], replyToId?: string) => {
    if (!user || !body.trim()) return;
    const msg = await api.post<Message>(`/api/messages/${channelId}`, {
      body,
      mention_user_ids: mentionUserIds,
      reply_to_id: replyToId,
    });
    setMessages((prev) => [...prev, msg]);
  };

  const sendMedia = async (payload: { data_url: string; file_name?: string; duration_ms?: number; caption?: string; mention_user_ids?: string[]; reply_to_id?: string }) => {
    if (!user) return;
    const msg = await api.post<Message>(`/api/messages/${channelId}/media`, payload);
    setMessages((prev) => [...prev, msg]);
  };

  const createPoll = async (payload: { question: string; options: string[]; allows_multiple: boolean }) => {
    if (!user) return;
    const msg = await api.post<Message>(`/api/messages/${channelId}/polls`, payload);
    setMessages((prev) => [...prev, msg]);
  };

  const votePoll = async (messageId: string, optionId: string) => {
    const poll = await api.put<NonNullable<Message['poll']>>(`/api/messages/item/${messageId}/poll-vote`, { option_id: optionId });
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, poll } : message));
  };

  const deleteMessage = async (id: string) => {
    await api.delete(`/api/messages/item/${id}`);
    setMessages((current) => current.filter((message) => message.id !== id));
  };

  const editMessage = async (id: string, body: string) => {
    await api.put(`/api/messages/item/${id}`, { body });
    setMessages((current) => current.map((message) => message.id === id
      ? { ...message, body: body.trim(), updatedAt: new Date().toISOString() }
      : message));
  };

  const toggleReaction = async (id: string, emoji: string) => {
    const reactions = await api.put<Message['reactions']>(`/api/messages/item/${id}/reactions`, { emoji });
    setMessages((current) => current.map((message) => message.id === id ? { ...message, reactions } : message));
  };

  const getReceiptDetails = (id: string) => api.get<MessageReceiptDetails>(`/api/messages/item/${id}/receipts`);

  return { messages, members, unreadMarker, loading, sendMessage, sendMedia, createPoll, votePoll, deleteMessage, editMessage, toggleReaction, getReceiptDetails, refetch: fetchMessages, currentUserId: user?.id };
}
