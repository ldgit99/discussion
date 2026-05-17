'use client';

import { Sparkles } from 'lucide-react';
import { RoomHeader } from '@/components/room/room-header';
import { ChatPanel } from '@/components/room/chat-panel';
import { BoardPanel } from '@/components/room/board-panel';
import { ResultStrip } from '@/components/room/result-strip';
import { usePresence } from '@/lib/realtime/use-presence';

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

// design.md §13.3 학생 토의방 (2주차: 채팅 + 보드 + 결과 활성, AI 패널은 3주차)
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

        {/* AI 패널 placeholder — 3주차에 활성화 */}
        <aside className="hidden xl:flex flex-col bg-neutral-50 min-h-0 border-l border-neutral-200">
          <div className="px-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-600 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ai-500" />
            AI 보조 패널
          </div>
          <div className="flex-1 p-4 flex items-center justify-center">
            <p className="text-xs text-neutral-400 italic text-center">
              AI 기능은 3주차에 활성화돼요.
            </p>
          </div>
        </aside>
      </div>

      <ResultStrip roomId={roomId} sessionId={sessionId} />
    </div>
  );
}
