import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoomLiveAnalytics } from './room-live-analytics';

export default async function TeacherRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: room } = await supabase
    .from('rooms')
    .select(
      'id, session_id, room_code, topic, stage, max_participants, time_limit_minutes'
    )
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .maybeSingle();

  if (!room) notFound();

  const meta = room as {
    id: string;
    session_id: string;
    room_code: string;
    topic: string;
    stage: string;
    max_participants: number;
    time_limit_minutes: number | null;
  };

  // 동의된 개인 채팅 참가자 id 미리 조회 (초기 SSR 데이터)
  const { data: participants } = await supabase
    .from('participants')
    .select('id, role')
    .eq('room_id', id);

  const studentIds = ((participants ?? []) as { id: string; role: string }[])
    .filter((p) => p.role === 'student')
    .map((p) => p.id);

  const { data: consents } =
    studentIds.length > 0
      ? await supabase
          .from('personal_chat_consent')
          .select('participant_id, teacher_view_allowed')
          .in('participant_id', studentIds)
      : { data: [] as { participant_id: string; teacher_view_allowed: boolean }[] };

  const consentedIds = (consents ?? [])
    .filter((c) => (c as { teacher_view_allowed: boolean }).teacher_view_allowed)
    .map((c) => (c as { participant_id: string }).participant_id);

  return (
    <main className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teacher">
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
      </Button>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{meta.topic}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
          <code className="font-mono font-bold text-brand-600">{meta.room_code}</code>
          <Badge variant="muted">{stageLabel(meta.stage)}</Badge>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            최대 {meta.max_participants}명
          </span>
          {meta.time_limit_minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {meta.time_limit_minutes}분
            </span>
          )}
          <Badge variant="success" className="text-2xs">
            실시간 분석
          </Badge>
        </div>
      </header>

      <RoomLiveAnalytics
        roomId={meta.id}
        sessionId={meta.session_id}
        maxParticipants={meta.max_participants}
        consentedIds={consentedIds}
      />
    </main>
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
