'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConsensusResult } from '@/lib/db/types';

type SessionMeta = {
  id: string;
  class_label: string | null;
  created_at: string;
  num_rooms: number;
  submitted_count: number;
};

type Props = {
  topic: string;
  sessions: SessionMeta[];
};

export function CompareClient({ topic, sessions }: Props) {
  const [resultsBySession, setResultsBySession] = useState<
    Map<string, ConsensusResult[]>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const sessionIds = sessions.map((s) => s.id);
      const { data } = await supabase
        .from('consensus_results')
        .select('*')
        .in('session_id', sessionIds)
        .order('submitted_at', { ascending: true });

      const map = new Map<string, ConsensusResult[]>();
      ((data as ConsensusResult[]) ?? []).forEach((r) => {
        if (!map.has(r.session_id)) map.set(r.session_id, []);
        map.get(r.session_id)!.push(r);
      });
      setResultsBySession(map);
      setLoading(false);
    })();
  }, [sessions]);

  return (
    <Card>
      <div className="p-6 space-y-4">
        <header>
          <h3 className="text-lg font-bold text-neutral-900">{topic}</h3>
          <p className="text-xs text-neutral-400 mt-1">
            {sessions.length}개 수업 · 총 모둠{' '}
            {sessions.reduce((s, x) => s + x.num_rooms, 0)}개
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-neutral-400 py-4">불러오는 중…</p>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-2 min-w-min">
              {sessions.map((s) => {
                const results = resultsBySession.get(s.id) ?? [];
                return (
                  <div
                    key={s.id}
                    className="w-72 shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-neutral-900">
                        {s.class_label ? `${s.class_label}반` : '반 미지정'}
                      </div>
                      <Badge variant="muted" className="text-2xs">
                        {s.submitted_count}/{s.num_rooms} 제출
                      </Badge>
                    </div>

                    {results.length === 0 ? (
                      <p className="text-xs text-neutral-400 italic py-4">
                        아직 제출된 결과가 없어요.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {results.map((r, idx) => (
                          <div
                            key={r.id}
                            className="text-xs bg-neutral-0 rounded-md p-2 space-y-1 border border-neutral-200"
                          >
                            <div className="flex items-center gap-1 text-2xs font-semibold text-neutral-600">
                              <CheckCircle2 className="h-3 w-3 text-success-500" />
                              모둠 {idx + 1}
                            </div>
                            <p className="text-sm text-neutral-800 line-clamp-3">
                              {r.representative_opinion}
                            </p>
                            {r.reason && (
                              <p className="text-2xs text-neutral-600 line-clamp-2">
                                💡 {r.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/teacher/sessions/${s.id}`}
                      className="text-2xs text-brand-600 hover:underline flex items-center gap-1"
                    >
                      자세히
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
