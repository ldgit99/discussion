import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// 교사 모둠 모니터링 — 1주차 스켈레톤
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
    .select('id, room_code, topic, stage, max_participants, time_limit_minutes')
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .single();

  if (!room) notFound();

  const { data: participants } = await supabase
    .from('participants')
    .select('id, nickname, role, joined_at')
    .eq('room_id', id);

  const studentCount = participants?.filter((p) => p.role === 'student').length ?? 0;

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teacher">
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
      </Button>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{room.topic}</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span className="flex items-center gap-1.5">
            <code className="font-mono font-bold text-brand-600">{room.room_code}</code>
          </span>
          <Badge variant="muted">{stageLabel(room.stage)}</Badge>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {studentCount}/{room.max_participants}
          </span>
          {room.time_limit_minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {room.time_limit_minutes}분
            </span>
          )}
        </div>
      </header>

      <Card>
        <CardContent className="p-6 space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900">참여자</h2>
          {participants && participants.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 text-sm text-neutral-800"
                >
                  <span className="font-medium">{p.nickname}</span>
                  <Badge variant={p.role === 'teacher' ? 'default' : 'muted'}>
                    {p.role === 'teacher' ? '교사' : '학생'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-600">아직 입장한 학생이 없어요.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-neutral-400 italic">
            실시간 모니터링·결과 보드는 2주차에 추가됩니다 (plan.md §2.1.9).
          </p>
        </CardContent>
      </Card>
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
