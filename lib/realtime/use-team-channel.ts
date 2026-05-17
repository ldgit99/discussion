'use client';

import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/**
 * 모둠 한 개의 팀 채널을 보장. 같은 roomId로 여러 훅이 호출돼도 채널 1개만 유지.
 * 다른 훅(useTeamMessages 등)은 이 채널을 공유하지 않고 각자 postgres_changes 구독.
 * (단순화: 채널 공유 캐싱은 추후 최적화)
 */
export function useTeamChannel(roomId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    const ch = supabase.channel(`room:${roomId}:team`);
    channelRef.current = ch;
    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [roomId]);

  return channelRef.current;
}
