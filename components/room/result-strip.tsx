'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useConsensusSync } from '@/lib/realtime/use-consensus-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type Props = {
  roomId: string;
  sessionId: string;
};

// design.md §13.3 하단 영역 — 결과 저장
export function ResultStrip({ roomId, sessionId }: Props) {
  const { result, saving, submit } = useConsensusSync(roomId, sessionId);
  const [representative, setRepresentative] = useState('');
  const [reason, setReason] = useState('');
  const [improvements, setImprovements] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  useEffect(() => {
    if (result) {
      setRepresentative(result.representative_opinion);
      setReason(result.reason ?? '');
      setImprovements(result.improvements ?? '');
      setActionPlan(result.action_plan ?? '');
    }
  }, [result]);

  async function handleSubmit() {
    if (representative.trim().length === 0) return;
    await submit({
      representative_opinion: representative.trim(),
      reason: reason.trim() || undefined,
      improvements: improvements.trim() || undefined,
      action_plan: actionPlan.trim() || undefined,
    });
  }

  return (
    <footer className="border-t border-neutral-200 bg-neutral-0 shrink-0 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          모둠 토의 결과
          {result && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              제출됨
            </Badge>
          )}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <ResultField
          label="대표 의견"
          required
          value={representative}
          onChange={setRepresentative}
        />
        <ResultField label="선택 이유" value={reason} onChange={setReason} />
        <ResultField label="보완할 점" value={improvements} onChange={setImprovements} />
        <div className="flex gap-2">
          <div className="flex-1">
            <ResultField label="실행 계획" value={actionPlan} onChange={setActionPlan} />
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <Button
          onClick={handleSubmit}
          disabled={saving || representative.trim().length === 0}
          variant="consensus"
          size="sm"
        >
          <CheckCircle2 className="h-4 w-4" />
          {result ? '다시 제출하기' : '우리 모둠 의견 제출하기'}
        </Button>
      </div>
    </footer>
  );
}

function ResultField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-neutral-600">
        {label}
        {required && <span className="text-danger-500 ml-1">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${label} 입력`}
        className="h-9 text-sm"
        maxLength={2000}
      />
    </div>
  );
}
