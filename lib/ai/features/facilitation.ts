import { chat } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

/**
 * 토의 진행자 — 시작 안내·턴 안내·근거 요구.
 * trigger 종류:
 *   - 'room_start': 학생 입장 완료 시
 *   - 'next_turn': 다음 발화자 안내
 *   - 'evidence_request': 의견 등록 후 근거 요청
 */

export type FacilitationTrigger = 'room_start' | 'next_turn' | 'evidence_request' | 'respond';

export async function runFacilitation(opts: {
  roomId: string;
  topic: string;
  trigger: FacilitationTrigger;
  context?: {
    nextNickname?: string;
    lastUtterance?: string;
    participantNicknames?: string[];
  };
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  const userPrompt = buildPrompt(opts.topic, opts.trigger, opts.context);

  const raw = await chat({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.facilitation },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 200,
  });

  const mod = await moderate(raw);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  const v = validateOutput('facilitation', raw);
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: 'team',
    feature: 'facilitation',
    content: raw,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}

function buildPrompt(
  topic: string,
  trigger: FacilitationTrigger,
  ctx?: {
    nextNickname?: string;
    lastUtterance?: string;
    participantNicknames?: string[];
  }
): string {
  switch (trigger) {
    case 'room_start':
      return `오늘의 토의 주제: "${topic}"
참여 학생: ${ctx?.participantNicknames?.join(', ') ?? '모두'}
시작 안내 1-2문장만 작성해라. 주제 한 줄과 "돌아가며 의견을 들어볼까요?" 같은 안내.`;

    case 'next_turn':
      return `다음 발화자: ${ctx?.nextNickname ?? '다음 친구'}
주제: "${topic}"
"${ctx?.nextNickname}님 차례입니다, 의견을 들려주세요." 같은 짧은 격려 호명만.`;

    case 'evidence_request':
      return `방금 한 학생이 의견을 등록했어요: "${ctx?.lastUtterance?.slice(0, 200) ?? ''}"
"왜 그렇게 생각하나요?" 같은 근거 요구 질문 1개만 만들어라.`;

    case 'respond':
      return `토의 주제: "${topic}"
방금 학생 발화: "${ctx?.lastUtterance?.slice(0, 300) ?? ''}"

이 발화에 짧게 반응해라. 1-2문장.
- 의견을 평가("좋다/맞다/틀리다")하지 마라.
- 짧게 격려·확인하거나, 토의를 이어가는 가벼운 질문 하나.
- 예: "잘 들었어요. 다른 친구는 어떻게 생각하세요?" / "그 부분에 대해 좀 더 들려줄 수 있을까요?"`;
  }
}
