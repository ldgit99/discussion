'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Opinion } from '@/lib/db/types';

export function useOpinionsSync(roomId: string | null) {
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('opinions')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (mounted) {
        setOpinions((data as Opinion[]) ?? []);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`room:${roomId}:opinions`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opinions', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const o = payload.new as Opinion;
            setOpinions((prev) =>
              prev.some((x) => x.id === o.id) ? prev : [...prev, o]
            );
          } else if (payload.eventType === 'UPDATE') {
            const o = payload.new as Opinion;
            setOpinions((prev) => prev.map((x) => (x.id === o.id ? o : x)));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Opinion;
            setOpinions((prev) => prev.filter((x) => x.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  const addOpinion = useCallback(
    async (content: string, evidence: string) => {
      if (!roomId) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const nickname = (user.user_metadata?.nickname as string) ?? '익명';

      const { data, error } = await supabase
        .from('opinions')
        .insert({
          room_id: roomId,
          author_id: user.id,
          author_nickname: nickname,
          content,
          evidence: evidence || null,
        })
        .select('*')
        .single();
      if (error) {
        toast.error('의견 등록이 안 됐어요. 다시 시도해주세요.');
        return null;
      }
      return data as Opinion;
    },
    [roomId]
  );

  const deleteOpinion = useCallback(
    async (opinionId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('opinions').delete().eq('id', opinionId);
      if (error) {
        toast.error('삭제가 안 됐어요.');
      }
    },
    []
  );

  return { opinions, loading, addOpinion, deleteOpinion };
}
