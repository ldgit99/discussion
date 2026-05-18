'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Layers, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  session: {
    id: string;
    topic: string;
    total_students: number;
    num_rooms: number;
    stage: string;
  };
};

export function SessionCard({ session: s }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from('sessions').delete().eq('id', s.id);
      if (error) {
        toast.error('삭제가 안 됐어요. 다시 시도해주세요.');
        return;
      }
      toast.success('수업이 삭제됐어요.');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className="hover:shadow-md transition-shadow relative group">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2">{s.topic}</CardTitle>
          <Badge variant={stageBadgeVariant(s.stage)}>{stageLabel(s.stage)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-neutral-600">
            <Users className="h-4 w-4" />
            학생 {s.total_students}명
          </div>
          <div className="flex items-center gap-1.5 text-neutral-600">
            <Layers className="h-4 w-4" />
            모둠 {s.num_rooms}개
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/teacher/sessions/${s.id}`}>모둠 코드 보기</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-neutral-400 hover:text-danger-500 hover:bg-danger-50"
            onClick={() => setOpen(true)}
            aria-label="수업 삭제"
            title="수업 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이 수업을 삭제할까요?</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                <strong className="text-neutral-900">"{s.topic}"</strong> 수업과 그
                안의 모둠 {s.num_rooms}개, 채팅·의견·결과가 모두 삭제됩니다.
              </span>
              <span className="block text-danger-500 font-medium">
                이 작업은 되돌릴 수 없어요.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? '삭제 중…' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function stageLabel(stage: string): string {
  return (
    { waiting: '대기 중', active: '진행 중', closed: '종료' } as Record<string, string>
  )[stage] ?? stage;
}

function stageBadgeVariant(stage: string): 'success' | 'muted' | 'default' {
  if (stage === 'closed') return 'muted';
  if (stage === 'active') return 'success';
  return 'default';
}
