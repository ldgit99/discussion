'use client';

import { useState } from 'react';
import { Users, User, Lock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TeamChatPanel } from './team-chat-panel';
import { PersonalChatPanel } from './personal-chat-panel';

type Props = {
  roomId: string;
  participantId: string | null; // null이면 교사 (개인 모드 비활성)
  myNickname: string;
  onModeChange?: (mode: 'team' | 'personal') => void;
};

// design.md §10 — 팀/개인 채팅 탭 전환
export function ChatPanelTabs({ roomId, participantId, myNickname, onModeChange }: Props) {
  const [mode, setMode] = useState<'team' | 'personal'>('team');

  function handleChange(v: string) {
    const m = v as 'team' | 'personal';
    setMode(m);
    onModeChange?.(m);
  }

  return (
    <section className="border-r border-neutral-200 flex flex-col min-h-0">
      <Tabs
        value={mode}
        onValueChange={handleChange}
        className="flex flex-col h-full min-h-0"
      >
        <div className="px-3 pt-3 pb-2 border-b border-neutral-200 bg-neutral-0 shrink-0">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="team">
              <Users className="h-4 w-4" />
              팀
            </TabsTrigger>
            <TabsTrigger
              value="personal"
              disabled={!participantId}
              title={participantId ? '' : '학생만 사용 가능'}
            >
              <div className="relative">
                <User className="h-4 w-4" />
                <Lock className="h-2.5 w-2.5 absolute -bottom-0.5 -right-1 text-personal-accent" />
              </div>
              개인
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="team" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <TeamChatPanel roomId={roomId} myNickname={myNickname} />
        </TabsContent>
        <TabsContent
          value="personal"
          className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden"
        >
          {participantId ? (
            <PersonalChatPanel
              roomId={roomId}
              participantId={participantId}
              myNickname={myNickname}
            />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-8">
              개인 채팅은 학생만 사용할 수 있어요.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
