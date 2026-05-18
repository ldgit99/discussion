'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Participant } from '@/lib/db/types';

/**
 * 특정 모둠의 participants를 실시간으로 동기화 (입장·퇴장 감지).
 * 교사 모둠 상세 페이지에서 사용.
 */
export function useRoomParticipants(roomId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const channelKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });
      if (mounted) {
        setParticipants((data as Participant[]) ?? []);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`room:${roomId}:participants:${channelKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new as Participant;
            setParticipants((prev) =>
              prev.some((x) => x.id === n.id) ? prev : [...prev, n]
            );
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Participant;
            setParticipants((prev) => prev.filter((x) => x.id !== old.id));
          } else if (payload.eventType === 'UPDATE') {
            const n = payload.new as Participant;
            setParticipants((prev) => prev.map((x) => (x.id === n.id ? n : x)));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId, channelKey]);

  return { participants, loading };
}
