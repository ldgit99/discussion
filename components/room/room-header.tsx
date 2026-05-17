'use client';

import { Users, Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Props = {
  topic: string;
  stage: string;
  roomCode: string;
  maxParticipants: number;
  timeLimitMinutes: number | null;
  onlineCount: number;
  myNickname: string;
};

// design.md §5.2 + research.md §4.2 헤더
export function RoomHeader({
  topic,
  stage,
  roomCode,
  maxParticipants,
  timeLimitMinutes,
  onlineCount,
  myNickname,
}: Props) {
  return (
    <header className="h-14 px-4 lg:px-6 border-b border-neutral-200 bg-neutral-0 flex items-center gap-3 shrink-0">
      <h1 className="text-base font-semibold text-neutral-900 truncate flex-1">{topic}</h1>
      <div className="hidden md:flex items-center gap-3 text-sm text-neutral-600">
        <Badge variant="muted">{stageLabel(stage)}</Badge>
        {timeLimitMinutes && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {timeLimitMinutes}분
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {onlineCount}/{maxParticipants}
        </span>
        <code className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
          {roomCode}
        </code>
      </div>
      <div className="text-sm font-medium text-neutral-800 flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5 text-ai-500 md:hidden" />
        {myNickname}
      </div>
    </header>
  );
}

function stageLabel(stage: string): string {
  return (
    {
      waiting: '대기 중',
      intro: '안내 중',
      turn_taking: '의견 발표',
      discussion: '토의 중',
      consensus: '합의 중',
      submitted: '제출 완료',
      closed: '종료',
    } as Record<string, string>
  )[stage] ?? stage;
}
