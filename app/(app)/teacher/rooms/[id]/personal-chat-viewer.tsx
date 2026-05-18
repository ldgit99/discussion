'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/db/types';

type Props = {
  participantId: string;
  nickname: string;
};

export function PersonalChatViewer({ participantId, nickname }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMessages(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('fetch_personal_chat', {
        p_participant_id: participantId,
      });
      if (error) {
        toast.error('조회가 안 됐어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      setMessages((data as Message[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          열람
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{nickname} 학생의 개인 채팅</DialogTitle>
          <DialogDescription>
            이 학생이 AI 코치와 1:1로 나눈 모든 대화입니다. 다른 학생은 볼 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 -mx-2">
          <div className="px-2 space-y-2">
            {loading && <p className="text-sm text-neutral-400 text-center py-8">불러오는 중…</p>}
            {!loading && messages && messages.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-8">
                개인 채팅 기록이 없어요.
              </p>
            )}
            {!loading &&
              messages?.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    m.message_type === 'utterance'
                      ? 'bg-personal-badge-bg/40 border-personal-border'
                      : 'bg-ai-50 border-ai-200'
                  }`}
                >
                  <div className="text-2xs font-semibold text-neutral-600 mb-1">
                    {m.message_type === 'utterance' ? m.author_nickname : 'AI 코치'} ·{' '}
                    {new Date(m.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="text-neutral-800 whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
