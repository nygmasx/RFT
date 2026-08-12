import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/lib/database.types';

export function useMessages(channelId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
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

  useEffect(() => {
    if (!channelId) return;
    const initialFetch = setTimeout(fetchMessages, 0);
    // Poll every 3s for new messages
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      clearTimeout(initialFetch);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [channelId, fetchMessages]);

  const sendMessage = async (body: string) => {
    if (!user || !body.trim()) return;
    try {
      const msg = await api.post<Message>(`/api/messages/${channelId}`, { body });
      setMessages((prev) => [...prev, msg]);
    } catch (e: any) {
      console.error('[sendMessage]', e.message);
    }
  };

  const deleteMessage = async (id: string) => {
    await api.delete(`/api/messages/item/${id}`);
    setMessages((current) => current.filter((message) => message.id !== id));
  };

  return { messages, loading, sendMessage, deleteMessage, currentUserId: user?.id };
}
