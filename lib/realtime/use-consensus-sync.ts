'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { ConsensusResult } from '@/lib/db/types';

export function useConsensusSync(roomId: string | null, sessionId: string | null) {
  const [result, setResult] = useState<ConsensusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('consensus_results')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();
      if (mounted) {
        setResult((data as ConsensusResult) ?? null);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`room:${roomId}:consensus`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consensus_results',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setResult(null);
          } else {
            setResult(payload.new as ConsensusResult);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  const submit = useCallback(
    async (fields: {
      representative_opinion: string;
      reason?: string;
      improvements?: string;
      action_plan?: string;
    }) => {
      if (!roomId || !sessionId) return;
      setSaving(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
          room_id: roomId,
          session_id: sessionId,
          representative_opinion: fields.representative_opinion,
          reason: fields.reason ?? null,
          improvements: fields.improvements ?? null,
          action_plan: fields.action_plan ?? null,
          submitted_by: user.id,
        };

        // UPSERT (room_id unique constraint)
        const { error } = await supabase
          .from('consensus_results')
          .upsert(payload, { onConflict: 'room_id' });
        if (error) {
          toast.error('제출이 안 됐어요. 다시 시도해주세요.');
          return;
        }
        toast.success('우리 모둠 의견이 제출됐어요!');
      } finally {
        setSaving(false);
      }
    },
    [roomId, sessionId]
  );

  return { result, loading, saving, submit };
}
