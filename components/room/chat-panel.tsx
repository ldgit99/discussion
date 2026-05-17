'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Users } from 'lucide-react';
import { useTeamMessages } from '@/lib/realtime/use-team-messages';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/db/types';

type Props = {
  roomId: string;
  myNickname: string;
};

// design.md §11 발화자 위계 + §13.3 좌측 채팅
export function ChatPanel({ roomId, myNickname }: Props) {
  const { messages, loading, sendMessage } = useTeamMessages(roomId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
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

  return (
    <section className="border-r border-neutral-200 bg-neutral-0 flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-600 flex items-center gap-2 shrink-0">
        <Users className="h-4 w-4" />
        팀 채팅
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-neutral-400 text-center py-8">불러오는 중…</p>
          ) : messages.length === 0 ? (
            <EmptyChat />
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} message={m} mine={m.author_nickname === myNickname} />
            ))
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-200 shrink-0 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="팀에 의견 남기기…"
          maxLength={2000}
          disabled={sending}
          className="flex-1 h-10 rounded-lg border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-800 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <Button type="submit" size="icon" disabled={sending || draft.trim().length === 0}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-3 text-neutral-600">
      <Sparkles className="h-8 w-8 text-ai-500" />
      <p className="text-sm">아직 메시지가 없어요. 첫 의견을 남겨보세요.</p>
    </div>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const isAi = message.message_type !== 'utterance';
  if (isAi) {
    return (
      <div className="flex gap-2 max-w-[80%] animate-slide-down">
        <div className="w-8 h-8 rounded-full bg-ai-50 border border-ai-200 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-ai-500" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-2xs font-semibold text-ai-text">AI 진행자</div>
          <div className="rounded-lg bg-ai-50 border border-ai-200 px-3 py-2 text-sm text-neutral-800 whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  if (mine) {
    return (
      <div className="flex flex-col items-end gap-1 animate-slide-down">
        <div className="text-2xs font-semibold text-neutral-600">{message.author_nickname}</div>
        <div className="rounded-lg bg-brand-50 border border-brand-100 px-3 py-2 text-sm text-neutral-800 max-w-[85%] whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="text-2xs text-neutral-400">{formatTime(message.created_at)}</div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 animate-slide-down">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback>{initials(message.author_nickname ?? '?')}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="text-2xs font-semibold text-neutral-600">
          {message.author_nickname}
        </div>
        <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-800 max-w-[85%] whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="text-2xs text-neutral-400">{formatTime(message.created_at)}</div>
      </div>
    </div>
  );
}

function initials(nick: string): string {
  // 닉네임이 "반-번호-이름" 형태면 마지막 이름의 첫 글자
  const parts = nick.split('-');
  const last = parts[parts.length - 1] ?? nick;
  return last.slice(0, 1);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
