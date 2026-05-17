import { notFound, redirect } from 'next/navigation';
import { Users, Clock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';

// design.md §13.3 — 학생 토의방 (1주차 3분할 스켈레톤)
export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS로 참여자만 read 가능
  const { data: room } = await supabase
    .from('rooms')
    .select('id, topic, room_code, stage, max_participants, time_limit_minutes')
    .eq('id', id)
    .single();

  if (!room) notFound();

  // 본인 참여 확인
  const { data: myParticipation } = await supabase
    .from('participants')
    .select('id, nickname, role')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!myParticipation) {
    // 입장하지 않은 사용자 → /join으로
    redirect('/join');
  }

  const { count: participantCount } = await supabase
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', id)
    .eq('role', 'student');

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* 상단 헤더 — design.md §5.2 */}
      <header className="h-14 px-4 lg:px-6 border-b border-neutral-200 bg-neutral-0 flex items-center gap-4 shrink-0">
        <h1 className="text-base font-semibold text-neutral-900 truncate flex-1">
          {room.topic}
        </h1>
        <div className="hidden md:flex items-center gap-3 text-sm text-neutral-600">
          <Badge variant="muted">{stageLabel(room.stage)}</Badge>
          {room.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {room.time_limit_minutes}분
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {participantCount ?? 0}/{room.max_participants}
          </span>
          <code className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
            {room.room_code}
          </code>
        </div>
        <div className="text-sm font-medium text-neutral-800">
          {myParticipation.nickname}
        </div>
      </header>

      {/* 3분할 그리드 — design.md §5.2 */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[40%_60%] xl:grid-cols-[30%_45%_25%] min-h-0">
        {/* 좌측: 채팅 */}
        <section className="border-r border-neutral-200 bg-neutral-0 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-600">
            채팅 (팀)
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              icon={<Sparkles className="h-8 w-8 text-ai-500" />}
              text="AI가 토의를 시작하면 안내해줄 거예요."
            />
          </div>
        </section>

        {/* 중앙: 공동 보드 */}
        <section className="border-r border-neutral-200 bg-neutral-50 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-600">
            공동 토의 보드
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              icon={<Users className="h-8 w-8 text-neutral-400" />}
              text="곧 친구들이 들어와요. 잠깐 기다려주세요."
            />
          </div>
        </section>

        {/* 우측: AI 패널 */}
        <aside className="hidden xl:flex flex-col bg-neutral-50 min-h-0">
          <div className="px-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-600">
            AI 보조 패널
          </div>
          <div className="flex-1 p-4 space-y-2">
            <p className="text-xs text-neutral-400 italic text-center mt-8">
              AI 기능은 3주차에 활성화됩니다 (plan.md §3.1).
            </p>
          </div>
        </aside>
      </div>

      {/* 하단: 결과 영역 (placeholder) */}
      <footer className="h-[120px] px-4 lg:px-6 py-3 border-t border-neutral-200 bg-neutral-0 shrink-0">
        <p className="text-xs text-neutral-400 italic text-center mt-8">
          모둠 결과 영역은 2주차에 활성화됩니다 (plan.md §2.1.8).
        </p>
      </footer>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center max-w-xs">
      {icon}
      <p className="text-sm text-neutral-600">{text}</p>
    </div>
  );
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    waiting: '대기 중',
    intro: '안내 중',
    turn_taking: '의견 발표',
    discussion: '토의 중',
    consensus: '합의 중',
    submitted: '제출 완료',
    closed: '종료',
  };
  return labels[stage] ?? stage;
}
