'use client';

import { useState } from 'react';
import { MessageSquare, LayoutGrid, Sparkles } from 'lucide-react';
import { RoomHeader } from '@/components/room/room-header';
import { ChatPanelTabs } from '@/components/room/chat-panel-tabs';
import { BoardPanel } from '@/components/room/board-panel';
import { ResultStrip } from '@/components/room/result-strip';
import { AIPanel } from '@/components/room/ai-panel';
import { AiTriggers } from '@/components/room/ai-triggers';
import { usePresence } from '@/lib/realtime/use-presence';
import { useOpinionsSync } from '@/lib/realtime/use-opinions-sync';
import { useMyParticipant } from '@/lib/realtime/use-my-participant';
import { useTeamMessages } from '@/lib/realtime/use-team-messages';
import { cn } from '@/lib/utils';

type Props = {
  roomId: string;
  sessionId: string;
  topic: string;
  roomCode: string;
  stage: string;
  maxParticipants: number;
  timeLimitMinutes: number | null;
  myUserId: string;
  myNickname: string;
};

type MobileTab = 'chat' | 'board' | 'ai';

export function RoomClient({
  roomId,
  sessionId,
  topic,
  roomCode,
  stage,
  maxParticipants,
  timeLimitMinutes,
  myUserId,
  myNickname,
}: Props) {
  const { count } = usePresence(roomId, myNickname);
  const { opinions } = useOpinionsSync(roomId);
  const { participant } = useMyParticipant(roomId);
  const { messages: teamMessages } = useTeamMessages(roomId);
  const [mode, setMode] = useState<'team' | 'personal'>('team');
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  const opinionIds = opinions.map((o) => o.id);
  const latest = opinions[opinions.length - 1] ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <RoomHeader
        topic={topic}
        stage={stage}
        roomCode={roomCode}
        maxParticipants={maxParticipants}
        timeLimitMinutes={timeLimitMinutes}
        onlineCount={count}
        myNickname={myNickname}
      />

      {/* 데스크톱: 3분할 그리드 / 태블릿: 2분할 + AI 패널 숨김 / 모바일: 단일 영역 + bottom tab */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[40%_60%] xl:grid-cols-[30%_45%_25%] min-h-0 overflow-hidden">
        {/* 좌측 - 채팅 */}
        <div
          className={cn(
            'min-h-0 h-full overflow-hidden',
            mobileTab === 'chat' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          )}
        >
          <ChatPanelTabs
            roomId={roomId}
            participantId={participant?.id ?? null}
            myNickname={myNickname}
            onModeChange={setMode}
          />
        </div>

        {/* 중앙 - 보드 */}
        <div
          className={cn(
            'min-h-0 h-full overflow-hidden',
            mobileTab === 'board' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          )}
        >
          <BoardPanel roomId={roomId} myUserId={myUserId} />
        </div>

        {/* 우측 - AI 패널: 데스크톱(xl)에서만 인라인 노출 / 모바일은 bottom tab 'ai' 활성 시 표시 */}
        <div
          className={cn(
            'min-h-0 h-full overflow-hidden',
            mobileTab === 'ai' ? 'flex flex-col xl:flex' : 'hidden xl:flex xl:flex-col'
          )}
        >
          <AIPanel roomId={roomId} opinionIds={opinionIds} mode={mode} />
        </div>
      </div>

      <ResultStrip roomId={roomId} sessionId={sessionId} />

      {/* 모바일·태블릿 bottom tabs (xl 미만에서 노출) */}
      <nav
        className="xl:hidden border-t border-neutral-200 bg-neutral-0 shrink-0 flex"
        aria-label="화면 전환"
      >
        <MobileTabBtn
          icon={<MessageSquare className="h-5 w-5" />}
          label="채팅"
          active={mobileTab === 'chat'}
          onClick={() => setMobileTab('chat')}
        />
        <MobileTabBtn
          icon={<LayoutGrid className="h-5 w-5" />}
          label="보드"
          active={mobileTab === 'board'}
          onClick={() => setMobileTab('board')}
        />
        <MobileTabBtn
          icon={<Sparkles className="h-5 w-5" />}
          label="AI"
          active={mobileTab === 'ai'}
          onClick={() => setMobileTab('ai')}
        />
      </nav>

      <AiTriggers
        roomId={roomId}
        opinionsCount={opinions.length}
        latestOpinionId={latest?.id ?? null}
        latestOpinionAuthorId={latest?.author_id ?? null}
        myUserId={myUserId}
        teamMessages={teamMessages}
      />
    </div>
  );
}

function MobileTabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-0.5 py-2 text-2xs font-medium transition-colors',
        active
          ? 'text-brand-600 border-t-2 border-brand-600 -mt-px'
          : 'text-neutral-400 hover:text-neutral-600'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
