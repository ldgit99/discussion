'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Participant } from '@/lib/db/types';

/**
 * 현재 로그인 사용자의 특정 방 participant row를 가져옴.
 * personal 채널 사용 시 필수 (participant.id가 채널 키).
 */
export function useMyParticipant(roomId: string | null) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) {
          setParticipant(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (mounted) {
        setParticipant((data as Participant) ?? null);
        setLoading(false);
      }
    })();
  }, [roomId]);

  return { participant, loading };
}
