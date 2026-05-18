import Link from 'next/link';
import { ArrowLeft, BarChart3, Sparkles, MessageSquare, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// 교사용 기초 분석 대시보드
// 본인 담당 모든 세션을 집계하여 SSCI 논문 가설 후보 지표 표시
export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 본인 세션의 room ids
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, session_id')
    .eq('teacher_id', user!.id);

  const roomIds = ((rooms as { id: string }[]) ?? []).map((r) => r.id);

  if (roomIds.length === 0) {
    return (
      <main className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/teacher">
            <ArrowLeft className="h-4 w-4" />
            대시보드로
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center text-neutral-600">
            아직 데이터가 없어요. 수업을 만들고 운영해보세요.
          </CardContent>
        </Card>
      </main>
    );
  }

  // 집계 — 6개 핵심 지표
  const [
    { count: studentUtterances },
    { count: aiMessages },
    { count: opinions },
    { count: boardEdits },
    { count: consensusSubmitted },
    { count: attitudeFlags },
  ] = await Promise.all([
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds)
      .eq('message_type', 'utterance'),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds)
      .neq('message_type', 'utterance'),
    supabase
      .from('opinions')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds),
    supabase
      .from('board_items')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds),
    supabase
      .from('consensus_results')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds),
    supabase
      .from('attitude_flags')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds),
  ]);

  // AI 기능별 호출 분포
  const { data: aiByFeature } = await supabase
    .from('messages')
    .select('ai_feature')
    .in('room_id', roomIds)
    .not('ai_feature', 'is', null);

  const featureCount = new Map<string, number>();
  ((aiByFeature as { ai_feature: string }[]) ?? []).forEach((m) => {
    featureCount.set(m.ai_feature, (featureCount.get(m.ai_feature) ?? 0) + 1);
  });
  const aiSorted = Array.from(featureCount.entries()).sort((a, b) => b[1] - a[1]);

  // 핵심 비율: AI 발화 vs 학생 발화 (Agency 보존 지표)
  const totalMsgs = (studentUtterances ?? 0) + (aiMessages ?? 0);
  const studentRatio =
    totalMsgs > 0 ? ((studentUtterances ?? 0) / totalMsgs) * 100 : 0;

  return (
    <main className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teacher">
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-brand-600" />
          분석 대시보드
        </h1>
        <p className="text-sm text-neutral-600">
          본인 담당 모든 세션의 기초 지표 (논문 후속 분석용 raw count)
        </p>
      </header>

      {/* 6개 핵심 지표 카드 */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="학생 발화"
          value={studentUtterances ?? 0}
          accent="brand"
        />
        <MetricCard
          icon={<Sparkles className="h-5 w-5" />}
          label="AI 발화"
          value={aiMessages ?? 0}
          accent="ai"
        />
        <MetricCard
          icon={<Layers className="h-5 w-5" />}
          label="의견 카드"
          value={opinions ?? 0}
        />
        <MetricCard label="보드 편집" value={boardEdits ?? 0} />
        <MetricCard label="제출된 합의" value={consensusSubmitted ?? 0} />
        <MetricCard
          label="태도 플래그"
          value={attitudeFlags ?? 0}
          accent={attitudeFlags && attitudeFlags > 0 ? 'warning' : undefined}
        />
      </section>

      {/* Agency 보존 핵심 비율 */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            Agency 보존 지표 (학생 발화 비율)
          </h2>
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-brand-600">
                {studentRatio.toFixed(1)}%
              </span>
              <span className="text-xs text-neutral-600">
                전체 발화 {totalMsgs.toLocaleString()}개 중 학생{' '}
                {(studentUtterances ?? 0).toLocaleString()}개 · AI{' '}
                {(aiMessages ?? 0).toLocaleString()}개
              </span>
            </div>
            <div className="h-3 rounded-full bg-neutral-100 overflow-hidden flex">
              <div
                className="bg-brand-600 h-full"
                style={{ width: `${studentRatio}%` }}
              />
              <div
                className="bg-ai-500 h-full"
                style={{ width: `${100 - studentRatio}%` }}
              />
            </div>
            <p className="text-xs text-neutral-600 italic">
              CLAUDE.md C1 (Agency 보존): 학생 발화가 AI 발화보다 충분히 많아야 합니다.
              논문에서는 보통 70-80% 이상을 목표로 합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI 기능 사용 분포 */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">AI 기능 사용 분포</h2>
          {aiSorted.length === 0 ? (
            <p className="text-sm text-neutral-400">아직 AI 호출이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {aiSorted.map(([feature, count]) => {
                const max = aiSorted[0][1];
                const pct = (count / max) * 100;
                return (
                  <li key={feature} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-neutral-800">
                        {featureLabel(feature)}
                      </span>
                      <span className="text-neutral-600">{count}회</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="bg-ai-500 h-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-neutral-400 italic">
        세부 시퀀스 분석(Lag Sequential Analysis 등)은 각 세션 상세 페이지의 [연구 데이터]
        버튼으로 JSON을 받아 R/Python에서 처리할 수 있습니다.
      </p>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  accent?: 'brand' | 'ai' | 'warning';
}) {
  const color =
    accent === 'brand'
      ? 'text-brand-600'
      : accent === 'ai'
      ? 'text-ai-500'
      : accent === 'warning'
      ? 'text-warning-500'
      : 'text-neutral-800';
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-neutral-600">
          {icon}
          {label}
        </div>
        <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function featureLabel(f: string): string {
  const map: Record<string, string> = {
    facilitation: '토의 진행',
    summary: '정리하기',
    compare: '의견 비교',
    evidence_check: '근거 확인',
    question_gen: '질문 만들기',
    attitude_check: '태도 점검',
    consensus_aid: '합의 돕기',
    coaching: '개인 코칭',
  };
  return map[f] ?? f;
}
