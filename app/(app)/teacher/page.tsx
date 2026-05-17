import Link from 'next/link';
import { Plus, Users, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// design.md §5.3, §13.4 — 교사 대시보드 (Session 카드 기반)
export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from('sessions')
    .select(
      'id, topic, total_students, num_rooms, group_size, stage, time_limit_minutes, created_at'
    )
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false });

  const hasSessions = (sessions?.length ?? 0) > 0;

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-neutral-900">교사 대시보드</h1>
          <p className="text-sm text-neutral-600">
            한 수업을 만들면 모둠 코드가 자동으로 나뉘어요.
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/sessions/new">
            <Plus className="h-5 w-5" />새 수업 만들기
          </Link>
        </Button>
      </header>

      {!hasSessions ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <Plus className="h-8 w-8 text-brand-600" />
            </div>
            <p className="text-base text-neutral-600 text-center max-w-sm">
              첫 수업을 만들면 학생들이 입장할 모둠 코드를 받게 돼요.
            </p>
            <Button asChild size="lg">
              <Link href="/teacher/sessions/new">첫 수업 만들기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions!.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2">{s.topic}</CardTitle>
                  <Badge variant={stageBadgeVariant(s.stage)}>
                    {stageLabel(s.stage)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Users className="h-4 w-4" />
                    학생 {s.total_students}명
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Layers className="h-4 w-4" />
                    모둠 {s.num_rooms}개
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/teacher/sessions/${s.id}`}>모둠 코드 보기</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}

function stageLabel(stage: string): string {
  return (
    { waiting: '대기 중', active: '진행 중', closed: '종료' } as Record<
      string,
      string
    >
  )[stage] ?? stage;
}

function stageBadgeVariant(
  stage: string
): 'success' | 'muted' | 'default' {
  if (stage === 'closed') return 'muted';
  if (stage === 'active') return 'success';
  return 'default';
}
