'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/lib/db/types';

/**
 * 모둠 팀 채널의 messages 실시간 동기화.
 * - 초기 로드 + INSERT 구독
 * - sendMessage(content): 본인 닉네임/uid로 insert
 */
export function useTeamMessages(roomId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    let mounted = true;

    // 초기 로드
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('channel', 'team')
        .order('created_at', { ascending: true })
        .limit(500);
      if (mounted) {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      }
    })();

    // 실시간 구독
    const ch = supabase
      .channel(`room:${roomId}:team:messages`)
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
          if (m.channel !== 'team') return;
          setMessages((prev) => {
            // 낙관적 동시성: 같은 id 있으면 교체 (본인 발화 echo 처리)
            if (prev.some((x) => x.id === m.id)) {
              return prev.map((x) => (x.id === m.id ? m : x));
            }
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const nickname = (user.user_metadata?.nickname as string) ?? '익명';

      // 낙관적: 즉시 임시 메시지 추가
      const tempId = crypto.randomUUID();
      const optimistic: Message = {
        id: tempId,
        room_id: roomId,
        channel: 'team',
        author_id: user.id,
        author_nickname: nickname,
        content,
        message_type: 'utterance',
        ai_feature: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { error, data } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          channel: 'team',
          author_id: user.id,
          author_nickname: nickname,
          content,
          message_type: 'utterance',
        })
        .select('*')
        .single();

      if (error) {
        // 롤백
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error('전송이 안 됐어요. 다시 시도해주세요.');
        return;
      }
      // tempId 제거 + 실제 row 추가 (broadcast로도 곧 옴)
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempId).concat([data as Message])
      );
    },
    [roomId]
  );

  return { messages, loading, sendMessage };
}
