'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  ListChecks,
  GitCompare,
  Search,
  HelpCircle,
  Heart,
  Handshake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type AiFeatureButton = {
  feature: 'summary' | 'compare' | 'evidence_check' | 'question_gen' | 'attitude_check' | 'consensus_aid';
  label: string;
  icon: React.ReactNode;
  endpoint: string;
  enabled: boolean; // 3주차에 활성화될 것만 true. 나머지는 4주차.
};

const BUTTONS: AiFeatureButton[] = [
  {
    feature: 'summary',
    label: '정리하기',
    icon: <ListChecks className="h-4 w-4" />,
    endpoint: '/api/ai/summary',
    enabled: true,
  },
  {
    feature: 'compare',
    label: '의견 비교',
    icon: <GitCompare className="h-4 w-4" />,
    endpoint: '/api/ai/compare',
    enabled: true,
  },
  {
    feature: 'evidence_check',
    label: '근거 확인',
    icon: <Search className="h-4 w-4" />,
    endpoint: '/api/ai/evidence-check',
    enabled: true,
  },
  {
    feature: 'consensus_aid',
    label: '합의 돕기',
    icon: <Handshake className="h-4 w-4" />,
    endpoint: '/api/ai/consensus-aid',
    enabled: true,
  },
  {
    feature: 'question_gen',
    label: '질문 만들기',
    icon: <HelpCircle className="h-4 w-4" />,
    endpoint: '/api/ai/question-gen',
    enabled: false, // 4주차
  },
  {
    feature: 'attitude_check',
    label: '태도 점검',
    icon: <Heart className="h-4 w-4" />,
    endpoint: '/api/ai/attitude-check',
    enabled: false, // 4주차
  },
];

type Props = {
  roomId: string;
  opinionIds: string[]; // 근거 확인용 — 최신 의견 id (선택 필요 시 다이얼로그)
};

export function AIPanel({ roomId, opinionIds }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  async function callAi(btn: AiFeatureButton) {
    if (!btn.enabled) {
      toast.info('이 기능은 다음 단계에서 활성화돼요.');
      return;
    }
    setPending(btn.feature);

    try {
      const body: Record<string, unknown> = { roomId };
      if (btn.feature === 'evidence_check') {
        if (opinionIds.length === 0) {
          toast.error('의견 카드가 있어야 근거를 확인할 수 있어요.');
          return;
        }
        body.opinionId = opinionIds[opinionIds.length - 1]; // 가장 최근 의견
      }

      const res = await fetch(btn.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(uxErrorMessage(data.error));
        return;
      }
      toast.success('AI 응답이 채팅에 추가됐어요.');
    } catch (e) {
      console.error('[ai-panel]', e);
      toast.error('지금은 안내가 어려워요. 잠깐 후 다시 눌러주세요.');
    } finally {
      setPending(null);
    }
  }

  return (
    <aside className="hidden xl:flex flex-col bg-neutral-50 min-h-0 border-l border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-600 flex items-center gap-2 shrink-0">
        <Sparkles className="h-4 w-4 text-ai-500" />
        AI 보조 패널
      </div>
      <div className="flex-1 p-3 space-y-2">
        {BUTTONS.map((btn) => (
          <Button
            key={btn.feature}
            variant={btn.enabled ? 'ai' : 'outline'}
            size="default"
            className="w-full justify-start"
            disabled={!btn.enabled || pending !== null}
            onClick={() => callAi(btn)}
            title={btn.enabled ? '' : '다음 단계에서 활성화'}
          >
            {pending === btn.feature ? (
              <Sparkles className="h-4 w-4 animate-pulse" />
            ) : (
              btn.icon
            )}
            {pending === btn.feature ? 'AI가 생각 중…' : btn.label}
          </Button>
        ))}
        <p className="text-2xs text-neutral-400 italic pt-2 text-center">
          AI는 학생 의견을 기반으로만 안내합니다.
        </p>
      </div>
    </aside>
  );
}

function uxErrorMessage(code: unknown): string {
  if (typeof code !== 'string') return '지금은 안내가 어려워요. 잠깐 후 다시 눌러주세요.';
  if (code === 'no_opinions' || code === 'need_at_least_2_opinions') {
    return '먼저 의견 카드를 등록해주세요.';
  }
  if (code === 'opinion_not_found') return '대상 의견을 찾을 수 없어요.';
  if (code.startsWith('moderation:')) return '부적절한 표현이 감지돼 안내가 어려워요.';
  if (code.startsWith('guard:')) return '잠깐, 안내를 다시 만들어볼게요.';
  return '지금은 안내가 어려워요. 잠깐 후 다시 눌러주세요.';
}
