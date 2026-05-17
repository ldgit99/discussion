'use client';

import { RoomHeader } from '@/components/room/room-header';
import { ChatPanel } from '@/components/room/chat-panel';
import { BoardPanel } from '@/components/room/board-panel';
import { ResultStrip } from '@/components/room/result-strip';
import { AIPanel } from '@/components/room/ai-panel';
import { AiTriggers } from '@/components/room/ai-triggers';
import { usePresence } from '@/lib/realtime/use-presence';
import { useOpinionsSync } from '@/lib/realtime/use-opinions-sync';

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

// design.md §13.3 학생 토의방 (3주차: AI 패널·자동 트리거 활성)
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

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[40%_60%] xl:grid-cols-[30%_45%_25%] min-h-0">
        <ChatPanel roomId={roomId} myNickname={myNickname} />
        <BoardPanel roomId={roomId} myUserId={myUserId} />
        <AIPanel roomId={roomId} opinionIds={opinionIds} />
      </div>

      <ResultStrip roomId={roomId} sessionId={sessionId} />

      {/* 자동 트리거 (눈에 보이지 않음) */}
      <AiTriggers
        roomId={roomId}
        opinionsCount={opinions.length}
        latestOpinionId={latest?.id ?? null}
        latestOpinionAuthorId={latest?.author_id ?? null}
        myUserId={myUserId}
      />
    </div>
  );
}
