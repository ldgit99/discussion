'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Lock, Share2, Sparkles } from 'lucide-react';
import { usePersonalMessages } from '@/lib/realtime/use-personal-messages';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './team-chat-panel';

type Props = {
  roomId: string;
  participantId: string;
  myNickname: string;
};

// design.md §10.1, §10.3 — 개인 모드 채팅 + 팀 공유 액션
export function PersonalChatPanel({ roomId, participantId, myNickname }: Props) {
  const { messages, loading, sendMessage } = usePersonalMessages(roomId, participantId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setDraft('');
    await sendMessage(text);
    setSending(false);
  }

  async function shareToTeam(messageContent: string, messageId: string) {
    if (!confirm('이 내용을 팀 모두에게 보여줄까요?')) return;
    setSharingId(messageId);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 팀 채팅에 공유 마커와 함께 등장
      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        channel: 'team',
        author_id: user.id,
        author_nickname: myNickname,
        content: `🔒→👥 (개인에서 공유)\n${messageContent}`,
        message_type: 'utterance',
      });
      if (error) {
        toast.error('공유가 안 됐어요.');
        return;
      }
      toast.success('팀에 공유됐어요.');
    } finally {
      setSharingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-personal-bg border-l border-personal-border">
      <div className="px-4 py-2 border-b border-personal-border bg-personal-badge-bg/40 shrink-0 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-personal-accent" />
          <Badge variant="personal" className="text-xs">
            🔒 선생님과 나만 보는 공간
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-neutral-400 text-center py-8">불러오는 중…</p>
          ) : messages.length === 0 ? (
            <EmptyPersonal />
          ) : (
            messages.map((m) => (
              <div key={m.id} className="group relative">
                <MessageBubble message={m} mine={true} aiLabel="AI 코치" />
                {m.message_type === 'utterance' && (
                  <button
                    type="button"
                    onClick={() => shareToTeam(m.content, m.id)}
                    disabled={sharingId === m.id}
                    className="absolute top-0 right-0 text-2xs text-personal-accent hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    aria-label="팀에 공유"
                  >
                    <Share2 className="h-3 w-3" />
                    {sharingId === m.id ? '공유 중…' : '팀에 공유'}
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t border-personal-border shrink-0 flex gap-2 bg-personal-badge-bg/30">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="혼자만의 생각을 정리해보세요…"
          maxLength={2000}
          disabled={sending}
          className="flex-1 h-10 rounded-lg border border-personal-border bg-neutral-0 px-3 text-base text-neutral-800 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-personal-accent"
        />
        <Button type="submit" variant="personal" size="icon" disabled={sending || draft.trim().length === 0}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function EmptyPersonal() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-3 text-neutral-600">
      <Sparkles className="h-8 w-8 text-ai-500" />
      <p className="text-sm">AI 코치와 1:1로 생각을 정리할 수 있어요.</p>
      <p className="text-2xs text-personal-accent">다른 친구에게는 보이지 않아요. 선생님은 볼 수 있어요.</p>
    </div>
  );
}
