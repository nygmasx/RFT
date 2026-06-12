import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/lib/database.types';

export function useMessages(channelId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    // Initial fetch
    supabase
      .from('messages')
      .select('*, profiles(first_name, last_name)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          // Fetch full message with profile
          supabase
            .from('messages')
            .select('*, profiles(first_name, last_name)')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) setMessages(prev => [...prev, data as Message]);
            });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  const sendMessage = async (body: string) => {
    if (!user) return;
    await supabase.from('messages').insert({
      channel_id: channelId,
      user_id: user.id,
      body,
    });
  };

  return { messages, loading, sendMessage, currentUserId: user?.id };
}
