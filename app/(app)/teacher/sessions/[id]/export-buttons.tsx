'use client';

import { Download, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ConsensusResult } from '@/lib/db/types';

type Props = {
  sessionId: string;
  topic: string;
  rooms: { id: string; room_code: string }[];
  results: ConsensusResult[];
};

export function ExportButtons({ sessionId, topic, rooms, results }: Props) {
  function downloadCsv() {
    const header = [
      '모둠',
      '방코드',
      '대표 의견',
      '선택 이유',
      '보완할 점',
      '실행 계획',
      '제출 시각',
    ];
    const roomMap = new Map(rooms.map((r, i) => [r.id, { idx: i + 1, code: r.room_code }]));
    const rows = results.map((r) => {
      const meta = roomMap.get(r.room_id);
      return [
        meta ? `모둠 ${meta.idx}` : '-',
        meta?.code ?? '-',
        r.representative_opinion ?? '',
        r.reason ?? '',
        r.improvements ?? '',
        r.action_plan ?? '',
        new Date(r.submitted_at).toLocaleString('ko-KR'),
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '').replace(/"/g, '""');
            return `"${s}"`;
          })
          .join(',')
      )
      .join('\n');

    // UTF-8 BOM for Excel
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTopic = topic.replace(/[\\/:*?"<>|]/g, '').slice(0, 30);
    link.download = `${safeTopic}_결과.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={downloadCsv}
        disabled={results.length === 0}
      >
        <Download className="h-4 w-4" />
        CSV 내보내기
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/teacher/sessions/${sessionId}/share`}>
          <Share2 className="h-4 w-4" />
          전체 공유 모드
        </Link>
      </Button>
    </div>
  );
}
