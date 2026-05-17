import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// design.md §5.3, §13.4 — 교사 대시보드 (1주차 스켈레톤)
export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_code, topic, stage, max_participants, created_at')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false });

  const hasRooms = (rooms?.length ?? 0) > 0;

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-neutral-900">교사 대시보드</h1>
          <p className="text-sm text-neutral-600">
            모둠 토의를 만들고, 진행 상황을 한눈에 확인하세요.
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/rooms/new">
            <Plus className="h-5 w-5" />새 방 만들기
          </Link>
        </Button>
      </header>

      {!hasRooms ? (
        // design.md §13.5 빈 상태
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <Plus className="h-8 w-8 text-brand-600" />
            </div>
            <p className="text-base text-neutral-600 text-center max-w-sm">
              새 방을 만들어 학생들에게 코드를 알려주세요.
            </p>
            <Button asChild size="lg">
              <Link href="/teacher/rooms/new">첫 방 만들기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms!.map((room) => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2">{room.topic}</CardTitle>
                  <Badge variant={room.stage === 'closed' ? 'muted' : 'success'}>
                    {stageLabel(room.stage)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Users className="h-4 w-4" />
                  <span>최대 {room.max_participants}명</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">방 코드</span>
                  <code className="font-mono text-base font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded">
                    {room.room_code}
                  </code>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/teacher/rooms/${room.id}`}>모니터링</Link>
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
