'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Lock, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * 학생용 — 본인의 개인 채팅을 교사가 사후 조회할 수 있도록 동의.
 * 한 번 토글하면 personal_chat_consent 테이블에 upsert.
 */
type Props = {
  roomId: string;
  participantId: string;
};

export function ConsentDialog({ roomId, participantId }: Props) {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('personal_chat_consent')
        .select('teacher_view_allowed')
        .eq('participant_id', participantId)
        .maybeSingle();
      setAllowed(((data as { teacher_view_allowed?: boolean } | null)?.teacher_view_allowed) ?? false);
    })();
  }, [participantId]);

  async function toggle(next: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('personal_chat_consent').upsert(
      {
        participant_id: participantId,
        room_id: roomId,
        teacher_view_allowed: next,
      },
      { onConflict: 'participant_id' }
    );
    setSaving(false);
    if (error) {
      toast.error('설정이 저장되지 않았어요.');
      return;
    }
    setAllowed(next);
    toast.success(next ? '교사 열람을 허용했어요.' : '교사 열람을 막았어요.');
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs gap-1.5">
          {allowed ? (
            <Eye className="h-3.5 w-3.5 text-personal-accent" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-personal-accent" />
          )}
          교사 열람 {allowed ? '허용' : '비허용'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>개인 채팅 — 교사 열람 동의</DialogTitle>
          <DialogDescription>
            동의하면 토의가 끝난 뒤 담당 선생님이 내 개인 채팅 내용을 볼 수 있어요.
            동의하지 않으면 누구도 볼 수 없어요. 언제든 바꿀 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-neutral-600">
            현재 상태:{' '}
            <strong className={allowed ? 'text-personal-accent' : 'text-neutral-800'}>
              {allowed ? '교사 열람 허용' : '교사 열람 비허용 (나만 볼 수 있음)'}
            </strong>
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => toggle(false)}
            disabled={saving || allowed === false}
          >
            비허용
          </Button>
          <Button
            type="button"
            variant="personal"
            onClick={() => toggle(true)}
            disabled={saving || allowed === true}
          >
            교사 열람 허용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
