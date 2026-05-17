import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Printer, Users, Clock, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoomCodeGrid } from './room-code-grid';

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from('sessions')
    .select(
      'id, topic, total_students, num_rooms, group_size, stage, time_limit_minutes, created_at'
    )
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .single();

  if (!session) notFound();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_code, max_participants, stage')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  // 모둠별 입장 현황
  const { data: counts } = await supabase
    .from('participants')
    .select('room_id')
    .in('room_id', (rooms ?? []).map((r) => r.id))
    .eq('role', 'student');

  const occupancy = new Map<string, number>();
  (counts ?? []).forEach((p) => {
    occupancy.set(p.room_id, (occupancy.get(p.room_id) ?? 0) + 1);
  });

  const totalJoined = (counts ?? []).length;

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild className="print:hidden">
        <Link href="/teacher">
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-neutral-900">{session.topic}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
              <Badge variant={badgeVariant(session.stage)}>{stageLabel(session.stage)}</Badge>
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                모둠 {session.num_rooms}개
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {totalJoined}/{session.total_students}명 입장
              </span>
              {session.time_limit_minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {session.time_limit_minutes}분
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="print:hidden"
            onClick={undefined}
            asChild
          >
            <a href="#" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined') window.print(); }}>
              <Printer className="h-4 w-4" />
              인쇄·저장
            </a>
          </Button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 print:hidden">
          모둠 코드 — 학생에게 나눠주세요
        </h2>
        <RoomCodeGrid
          rooms={(rooms ?? []).map((r) => ({
            ...r,
            joined: occupancy.get(r.id) ?? 0,
          }))}
        />
      </section>

      <Card className="print:hidden">
        <CardContent className="p-6 text-sm text-neutral-600 space-y-1">
          <p>
            ✓ 학생들은 <strong>토론모임 사이트 → 코드 입력</strong> 화면에서 위 코드 중 하나를
            입력하면 입장합니다.
          </p>
          <p>
            ✓ 같은 모둠을 원하는 친구들끼리 같은 코드를 입력하도록 안내하세요.
          </p>
          <p>
            ✓ 모둠 정원이 차면 자동으로 입장이 막힙니다 (다른 코드 사용 안내).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function stageLabel(stage: string): string {
  return (
    { waiting: '대기 중', active: '진행 중', closed: '종료' } as Record<string, string>
  )[stage] ?? stage;
}

function badgeVariant(stage: string): 'success' | 'muted' | 'default' {
  if (stage === 'closed') return 'muted';
  if (stage === 'active') return 'success';
  return 'default';
}
