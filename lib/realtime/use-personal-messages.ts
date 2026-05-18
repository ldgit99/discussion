'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/lib/db/types';

/**
 * 개인 채팅 채널 — 본인만 read/write. CLAUDE.md C3 (채널 격리).
 * @param participantId 본인 participant.id (필수, 없으면 훅 비활성)
 */
export function usePersonalMessages(roomId: string | null, participantId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const channelName = participantId ? `personal:${participantId}` : null;
  const channelKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (!roomId || !channelName || !participantId) return;
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('channel', channelName)
        .order('created_at', { ascending: true })
        .limit(500);
      if (mounted) {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`${channelName}:messages:${channelKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          if (m.channel !== channelName) return;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId, channelName, participantId, channelKey]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId || !channelName) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const nickname = (user.user_metadata?.nickname as string) ?? '익명';

      const tempId = crypto.randomUUID();
      const optimistic: Message = {
        id: tempId,
        room_id: roomId,
        channel: channelName,
        author_id: user.id,
        author_nickname: nickname,
        content,
        message_type: 'utterance',
        ai_feature: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          channel: channelName,
          author_id: user.id,
          author_nickname: nickname,
          content,
          message_type: 'utterance',
        })
        .select('*')
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error('전송이 안 됐어요. 다시 시도해주세요.');
        return;
      }
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempId).concat([data as Message])
      );
    },
    [roomId, channelName]
  );

  return { messages, loading, sendMessage };
}
