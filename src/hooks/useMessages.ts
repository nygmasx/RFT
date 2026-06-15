import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/lib/database.types';

export function useMessages(channelId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = async () => {
    if (!channelId) return;
    try {
      const rows = await api.get<Message[]>(`/api/messages/${channelId}`);
      setMessages(rows ?? []);
    } catch (e: any) {
      console.error('[useMessages]', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!channelId) return;
    fetchMessages();
    // Poll every 3s for new messages
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [channelId]);

  const sendMessage = async (body: string) => {
    if (!user || !body.trim()) return;
    try {
      const msg = await api.post<Message>(`/api/messages/${channelId}`, { body });
      setMessages((prev) => [...prev, msg]);
    } catch (e: any) {
      console.error('[sendMessage]', e.message);
    }
  };

  return { messages, loading, sendMessage, currentUserId: user?.id };
}
