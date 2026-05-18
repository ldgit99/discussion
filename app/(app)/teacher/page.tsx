import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SessionCard } from './session-card';

type Session = {
  id: string;
  topic: string;
  total_students: number;
  num_rooms: number;
  group_size: number;
  stage: string;
  time_limit_minutes: number | null;
  class_label: string | null;
  created_at: string;
};

// design.md §5.3, §13.4 — 교사 대시보드 (반별 그룹핑)
export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from('sessions')
    .select(
      'id, topic, total_students, num_rooms, group_size, stage, time_limit_minutes, class_label, created_at'
    )
    .eq('teacher_id', user!.id)
    .order('class_label', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  const hasSessions = (sessions?.length ?? 0) > 0;

  // 반 라벨별 그룹핑 (라벨 없으면 '미지정' 그룹)
  const groups = new Map<string, Session[]>();
  ((sessions as Session[]) ?? []).forEach((s) => {
    const key = s.class_label ?? '__unset__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  });

  // 표시 순서: 학년·반 라벨 오름차순 → 미지정은 마지막
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === '__unset__') return 1;
    if (b === '__unset__') return -1;
    return classLabelKey(a) - classLabelKey(b);
  });

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-neutral-900">교사 대시보드</h1>
          <p className="text-sm text-neutral-600">
            한 수업을 만들면 모둠 코드가 자동으로 나뉘어요. 반별로 그룹핑됩니다.
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
        <div className="space-y-8">
          {sortedKeys.map((key) => {
            const list = groups.get(key)!;
            const isUnset = key === '__unset__';
            return (
              <section key={key} className="space-y-3">
                <div className="flex items-baseline gap-3 border-b border-neutral-200 pb-2">
                  <h2 className="text-xl font-bold text-neutral-900">
                    {isUnset ? '반 미지정' : `${key}반`}
                  </h2>
                  <span className="text-sm text-neutral-400">
                    {list.length}개 수업
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={{
                        id: s.id,
                        topic: s.topic,
                        total_students: s.total_students,
                        num_rooms: s.num_rooms,
                        stage: s.stage,
                        class_label: s.class_label,
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

/** "3-1" → 301, "3-10" → 310 형태의 정렬키 */
function classLabelKey(label: string): number {
  const m = label.match(/^(\d+)-(\d+)$/);
  if (!m) return 9999;
  return Number(m[1]) * 100 + Number(m[2]);
}
