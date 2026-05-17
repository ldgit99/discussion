import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// 전체 공유 모드 — 모든 모둠 결과를 한 화면에 큼직하게
export default async function ShareModePage({
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
    .select('id, topic, total_students, num_rooms')
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .maybeSingle();

  if (!session) notFound();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_code')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  const { data: results } = await supabase
    .from('consensus_results')
    .select('*')
    .eq('session_id', id)
    .order('submitted_at', { ascending: true });

  const roomMap = new Map(
    (rooms ?? []).map((r, i) => [
      (r as { id: string }).id,
      { idx: i + 1, code: (r as { room_code: string }).room_code },
    ])
  );

  return (
    <main className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/teacher/sessions/${id}`}>
          <ArrowLeft className="h-4 w-4" />
          세션 상세로
        </Link>
      </Button>

      <header className="space-y-3 text-center">
        <Badge variant="default" className="text-sm">전체 공유 모드</Badge>
        <h1 className="text-3xl font-bold text-neutral-900">
          {(session as { topic: string }).topic}
        </h1>
        <p className="text-sm text-neutral-600">
          학생 {(session as { total_students: number }).total_students}명 · 모둠{' '}
          {(session as { num_rooms: number }).num_rooms}개 ·{' '}
          {(results ?? []).length}개 제출
        </p>
      </header>

      {(results ?? []).length === 0 ? (
        <Card>
          <div className="p-12 text-center text-neutral-600">
            아직 제출된 모둠이 없어요.
          </div>
        </Card>
      ) : (
        <section className="space-y-6">
          {(results ?? []).map((r) => {
            const meta = roomMap.get((r as { room_id: string }).room_id);
            const result = r as {
              id: string;
              representative_opinion: string;
              reason: string | null;
              improvements: string | null;
              action_plan: string | null;
            };
            return (
              <Card key={result.id} className="overflow-hidden">
                <div className="bg-brand-50 border-b border-brand-100 px-6 py-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-brand-900">
                    모둠 {meta?.idx ?? '-'}
                  </h2>
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    제출
                  </Badge>
                </div>
                <div className="p-6 space-y-4">
                  <Field label="대표 의견" value={result.representative_opinion} highlight />
                  <Field label="선택 이유" value={result.reason} />
                  <Field label="보완할 점" value={result.improvements} />
                  <Field label="실행 계획" value={result.action_plan} />
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-neutral-600">{label}</div>
      <div
        className={`text-base ${
          highlight ? 'font-semibold text-neutral-900' : 'text-neutral-800'
        } whitespace-pre-wrap`}
      >
        {value || <span className="text-neutral-400 italic">입력 없음</span>}
      </div>
    </div>
  );
}
