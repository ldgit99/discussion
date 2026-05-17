'use client';

import Link from 'next/link';
import { Users, CheckCircle2 } from 'lucide-react';
import { useSessionRealtime } from '@/lib/realtime/use-session-realtime';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButtons } from './export-buttons';

type Room = {
  id: string;
  room_code: string;
  max_participants: number;
  stage: string;
};

type Props = {
  sessionId: string;
  topic: string;
  totalStudents: number;
  rooms: Room[];
};

export function SessionRealtime({ sessionId, topic, totalStudents, rooms }: Props) {
  const roomIds = rooms.map((r) => r.id);
  const { results, participants } = useSessionRealtime(sessionId, roomIds);

  const occupancy = new Map<string, number>();
  participants.forEach((p) => {
    occupancy.set(p.room_id, (occupancy.get(p.room_id) ?? 0) + 1);
  });

  const resultByRoom = new Map(results.map((r) => [r.room_id, r]));

  const submittedCount = results.length;

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 print:hidden">
          모둠 코드 — 학생에게 나눠주세요
        </h2>
        {rooms.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-neutral-600">모둠이 없어요.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3">
            {rooms.map((r, idx) => {
              const joined = occupancy.get(r.id) ?? 0;
              const submitted = resultByRoom.has(r.id);
              return (
                <Link key={r.id} href={`/teacher/rooms/${r.id}`} className="block group">
                  <Card className="hover:shadow-md transition-shadow print:shadow-none print:border-2">
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-sm text-neutral-600">
                        <span className="font-semibold">모둠 {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          {submitted && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              제출
                            </Badge>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {joined}/{r.max_participants}
                          </span>
                        </div>
                      </div>
                      <div className="text-center py-3">
                        <code className="font-mono text-3xl font-bold tracking-[0.3em] text-brand-600">
                          {r.room_code}
                        </code>
                      </div>
                      <p className="text-xs text-center text-neutral-400 group-hover:text-brand-600 transition-colors print:hidden">
                        클릭하면 모둠 상세
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Card className="print:hidden">
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              팀별 최종 토의 결과
              <Badge variant="muted">
                {submittedCount}/{rooms.length} 제출
              </Badge>
            </h2>
            <ExportButtons
              sessionId={sessionId}
              topic={topic}
              rooms={rooms.map((r) => ({ id: r.id, room_code: r.room_code }))}
              results={results}
            />
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4">아직 제출된 결과가 없어요.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-neutral-600 border-b border-neutral-200">
                  <tr>
                    <th className="py-2 pr-3">모둠</th>
                    <th className="py-2 pr-3">대표 의견</th>
                    <th className="py-2 pr-3">선택 이유</th>
                    <th className="py-2 pr-3">보완할 점</th>
                    <th className="py-2 pr-3">실행 계획</th>
                    <th className="py-2 pr-3">제출 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const idx = rooms.findIndex((x) => x.id === r.room_id);
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-neutral-100 animate-success-pulse"
                      >
                        <td className="py-2 pr-3 font-semibold text-neutral-800">
                          모둠 {idx + 1}
                        </td>
                        <td className="py-2 pr-3 text-neutral-800 max-w-xs">
                          {r.representative_opinion}
                        </td>
                        <td className="py-2 pr-3 text-neutral-600">{r.reason ?? '-'}</td>
                        <td className="py-2 pr-3 text-neutral-600">{r.improvements ?? '-'}</td>
                        <td className="py-2 pr-3 text-neutral-600">{r.action_plan ?? '-'}</td>
                        <td className="py-2 pr-3 text-xs text-neutral-400">
                          {new Date(r.submitted_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <p className="sr-only">
        주제: {topic}, 학생 {totalStudents}명
      </p>
    </>
  );
}
