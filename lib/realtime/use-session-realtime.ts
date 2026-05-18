'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ConsensusResult, Participant } from '@/lib/db/types';

/**
 * 교사 대시보드용 — 한 세션의 모든 모둠 결과 제출 실시간 수신 +
 * 모둠별 입장 인원 카운트 실시간 갱신.
 */
export function useSessionRealtime(sessionId: string | null, roomIds: string[]) {
  const [results, setResults] = useState<ConsensusResult[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const channelKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (!sessionId || roomIds.length === 0) return;
    const supabase = createClient();
    let mounted = true;

    // 초기 로드
    (async () => {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase
          .from('consensus_results')
          .select('*')
          .eq('session_id', sessionId)
          .order('submitted_at', { ascending: true }),
        supabase
          .from('participants')
          .select('*')
          .in('room_id', roomIds)
          .eq('role', 'student'),
      ]);
      if (mounted) {
        setResults((r as ConsensusResult[]) ?? []);
        setParticipants((p as Participant[]) ?? []);
      }
    })();

    const ch = supabase
      .channel(`teacher:session:${sessionId}:${channelKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consensus_results',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as ConsensusResult;
            setResults((prev) => prev.filter((x) => x.id !== old.id));
          } else if (payload.eventType === 'INSERT') {
            const n = payload.new as ConsensusResult;
            setResults((prev) =>
              prev.some((x) => x.id === n.id) ? prev : [...prev, n]
            );
          } else {
            const n = payload.new as ConsensusResult;
            setResults((prev) => prev.map((x) => (x.id === n.id ? n : x)));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new as Participant;
            if (roomIds.includes(n.room_id) && n.role === 'student') {
              setParticipants((prev) =>
                prev.some((x) => x.id === n.id) ? prev : [...prev, n]
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Participant;
            setParticipants((prev) => prev.filter((x) => x.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [sessionId, roomIds.join(','), channelKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { results, participants };
}
