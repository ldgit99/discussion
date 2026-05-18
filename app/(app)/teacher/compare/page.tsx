import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompareClient } from './compare-client';

// 같은 교사의 모든 세션을 주제별로 묶어 결과 비교 표시
export default async function ComparePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 세션 + consensus_results join
  const { data: sessions } = await supabase
    .from('sessions')
    .select(
      'id, topic, class_label, created_at, num_rooms'
    )
    .eq('teacher_id', user!.id)
    .order('topic', { ascending: true });

  const sessionIds = ((sessions as { id: string }[]) ?? []).map((s) => s.id);

  let resultsBySession = new Map<string, number>();
  if (sessionIds.length > 0) {
    const { data: counts } = await supabase
      .from('consensus_results')
      .select('session_id')
      .in('session_id', sessionIds);
    (counts ?? []).forEach((r) => {
      const sid = (r as { session_id: string }).session_id;
      resultsBySession.set(sid, (resultsBySession.get(sid) ?? 0) + 1);
    });
  }

  type Session = {
    id: string;
    topic: string;
    class_label: string | null;
    created_at: string;
    num_rooms: number;
  };

  // 주제별 그룹핑
  const byTopic = new Map<string, Session[]>();
  ((sessions as Session[]) ?? []).forEach((s) => {
    if (!byTopic.has(s.topic)) byTopic.set(s.topic, []);
    byTopic.get(s.topic)!.push(s);
  });

  // 비교 가능한 주제만 표시 (같은 주제로 2회 이상)
  const comparable = Array.from(byTopic.entries()).filter(([, list]) => list.length >= 2);

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teacher">
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900">결과 비교</h1>
        <p className="text-sm text-neutral-600">
          같은 주제로 운영한 여러 반의 결과를 한눈에 비교할 수 있어요.
        </p>
      </header>

      {comparable.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-neutral-600 space-y-2">
            <p>비교할 수 있는 주제가 아직 없어요.</p>
            <p className="text-sm text-neutral-400">
              같은 주제로 2개 이상의 수업을 만들면 여기서 비교가 가능합니다.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {comparable.map(([topic, list]) => (
            <CompareClient
              key={topic}
              topic={topic}
              sessions={list.map((s) => ({
                id: s.id,
                class_label: s.class_label,
                created_at: s.created_at,
                num_rooms: s.num_rooms,
                submitted_count: resultsBySession.get(s.id) ?? 0,
              }))}
            />
          ))}
        </div>
      )}

      {/* 나머지 주제 (비교 대상 아님)도 참고로 표시 */}
      {byTopic.size > comparable.length && (
        <section className="space-y-2 pt-6 border-t border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-600">
            한 번만 운영된 주제 ({byTopic.size - comparable.length}개)
          </h2>
          <div className="flex flex-wrap gap-2">
            {Array.from(byTopic.entries())
              .filter(([, list]) => list.length < 2)
              .map(([topic, list]) => (
                <Badge key={topic} variant="muted" className="text-xs">
                  {list[0].class_label ? `${list[0].class_label}반 · ` : ''}
                  {topic}
                </Badge>
              ))}
          </div>
        </section>
      )}
    </main>
  );
}
