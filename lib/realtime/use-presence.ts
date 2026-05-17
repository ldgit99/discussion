'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type PresenceState = {
  nickname: string;
  user_id: string;
  online_at: string;
};

/**
 * 모둠 팀 채널 presence — 현재 접속한 멤버 닉네임 리스트.
 */
export function usePresence(roomId: string | null, myNickname: string | null) {
  const [online, setOnline] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId || !myNickname) return;
    const supabase = createClient();
    const ch = supabase.channel(`room:${roomId}:presence`, {
      config: { presence: { key: myNickname } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<PresenceState>();
      const nicks = Object.keys(state);
      setOnline(nicks);
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          nickname: myNickname,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, myNickname]);

  return { online, count: online.length };
}
