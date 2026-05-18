'use client';

import { useState } from 'react';
import { Download, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * 연구용 익명화 데이터 export (논문 분석용).
 * export_research_data RPC 호출 → JSON 다운로드.
 *
 * 윤리 안내:
 *   - 학생·교사 식별 정보 제거 (P1, P2 등으로 익명화)
 *   - IRB 통과 + 보호자 동의 사후에만 활용 권장
 */
type Props = {
  sessionId: string;
  topic: string;
};

export function ResearchExportButton({ sessionId, topic }: Props) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('export_research_data', {
        p_session_id: sessionId,
      });
      if (error) {
        toast.error('내보내기에 실패했어요.');
        return;
      }
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTopic = topic.replace(/[\\/:*?"<>|]/g, '').slice(0, 30);
      a.download = `research_${safeTopic}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('JSON 파일로 저장됐어요.');
      setOpen(false);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="print:hidden">
          <FlaskConical className="h-4 w-4" />
          연구 데이터
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>연구용 익명화 데이터 내보내기</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              이 세션의 모든 활동 로그를 익명화해 JSON으로 저장합니다.
              학생 식별 정보는 <code>P1, P2…</code>로 대체됩니다.
            </span>
            <span className="block text-warning-500 text-xs">
              ⚠️ 논문·연구 목적 외 사용 금지. IRB 승인 및 보호자 동의 확인 후 활용하세요.
            </span>
            <span className="block text-xs text-neutral-600">
              포함되는 데이터: 발화 메시지, 의견 카드, 보드 편집, AI 호출 시점·기능,
              합의 결과, 학습 이벤트 시퀀스.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button type="button" onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? '내보내는 중…' : 'JSON 다운로드'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
