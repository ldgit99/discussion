'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { BoardItem } from '@/lib/db/types';

type BoardType = BoardItem['type'];

export function useBoardSync(roomId: string | null) {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const channelKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('board_items')
        .select('*')
        .eq('room_id', roomId)
        .order('type', { ascending: true })
        .order('position', { ascending: true });
      if (mounted) {
        setItems((data as BoardItem[]) ?? []);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`room:${roomId}:board:${channelKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_items', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const i = payload.new as BoardItem;
            setItems((prev) => (prev.some((x) => x.id === i.id) ? prev : [...prev, i]));
          } else if (payload.eventType === 'UPDATE') {
            const i = payload.new as BoardItem;
            setItems((prev) => prev.map((x) => (x.id === i.id ? i : x)));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as BoardItem;
            setItems((prev) => prev.filter((x) => x.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [roomId, channelKey]);

  const upsertItem = useCallback(
    async (type: BoardType, position: number, content: string, existingId?: string) => {
      if (!roomId) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const nickname = (user.user_metadata?.nickname as string) ?? '익명';

      if (existingId) {
        const { error } = await supabase
          .from('board_items')
          .update({
            content,
            updated_by: user.id,
            updated_by_nickname: nickname,
          })
          .eq('id', existingId);
        if (error) toast.error('보드 저장이 안 됐어요.');
      } else {
        const { error } = await supabase.from('board_items').insert({
          room_id: roomId,
          type,
          position,
          content,
          updated_by: user.id,
          updated_by_nickname: nickname,
        });
        if (error) toast.error('보드 저장이 안 됐어요.');
      }
    },
    [roomId]
  );

  const deleteItem = useCallback(async (itemId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('board_items').delete().eq('id', itemId);
    if (error) toast.error('삭제가 안 됐어요.');
  }, []);

  const itemsByType = useCallback(
    (type: BoardType) => items.filter((i) => i.type === type).sort((a, b) => a.position - b.position),
    [items]
  );

  return { items, loading, upsertItem, deleteItem, itemsByType };
}
