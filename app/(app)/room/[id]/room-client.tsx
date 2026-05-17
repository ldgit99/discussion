'use client';

import { useState } from 'react';
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
        <ChatPanelTabs
          roomId={roomId}
          participantId={participant?.id ?? null}
          myNickname={myNickname}
          onModeChange={setMode}
        />
        <BoardPanel roomId={roomId} myUserId={myUserId} />
        <AIPanel roomId={roomId} opinionIds={opinionIds} mode={mode} />
      </div>

      <ResultStrip roomId={roomId} sessionId={sessionId} />

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
