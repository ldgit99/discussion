import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, Clock, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PrintButton } from './print-button';
import { SessionRealtime } from './session-realtime';

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
    .maybeSingle();

  if (!session) notFound();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_code, max_participants, stage')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

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
              {session.time_limit_minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {session.time_limit_minutes}분
                </span>
              )}
            </div>
          </div>
          <PrintButton />
        </div>
      </header>

      <SessionRealtime
        sessionId={session.id}
        topic={session.topic}
        totalStudents={session.total_students}
        rooms={rooms ?? []}
      />
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
