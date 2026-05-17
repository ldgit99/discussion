'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  onSubmit: (content: string, evidence: string) => Promise<unknown>;
};

export function NewOpinionDialog({ onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (content.trim().length === 0) {
      toast.error('의견을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(content.trim(), evidence.trim());
    setSubmitting(false);
    if (result) {
      setContent('');
      setEvidence('');
      setOpen(false);
      toast.success('의견이 등록됐어요.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4" />새 의견 카드 등록
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>내 의견을 카드로 등록하기</DialogTitle>
          <DialogDescription>
            모둠 보드에 공유될 의견입니다. 등록 후에도 수정·삭제할 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opinion-content">어떤 의견인가요?</Label>
            <Textarea
              id="opinion-content"
              required
              maxLength={1000}
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: 점심 시간을 30분 더 늘리는 것이 좋다고 생각해요."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opinion-evidence">왜 그렇게 생각하나요? (선택)</Label>
            <Textarea
              id="opinion-evidence"
              maxLength={1000}
              rows={3}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="근거를 한 문장으로 적어보세요."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '등록 중…' : '카드 등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
