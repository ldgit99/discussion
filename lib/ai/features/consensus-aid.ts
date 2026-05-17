import { chatJson } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

type ConsensusOutput = {
  common: string[];
  remaining_issues: string[];
  guiding_question: string;
};

export async function runConsensusAid(opts: {
  roomId: string;
  opinions: Array<{ nickname: string; content: string; evidence?: string | null }>;
  boardSummary?: string;
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  if (opts.opinions.length === 0) {
    return { ok: false, reason: 'no_opinions' };
  }

  const opinionsText = opts.opinions
    .map((o, i) => `${i + 1}. ${o.nickname}: ${o.content}${o.evidence ? ` (근거: ${o.evidence})` : ''}`)
    .join('\n');

  const userPrompt = `학생들이 합의에 도달하려고 합니다. 다음을 정리해라:
1. 모두 동의할 수 있는 공통 요소
2. 아직 의견이 다른 쟁점
3. 합의에 도움이 될 질문 1개

대표 의견을 직접 추천하거나 합의문을 작성하지 마라.

의견:
${opinionsText}
${opts.boardSummary ? `\n보드 내용:\n${opts.boardSummary}` : ''}

JSON 형식: { "common": [...], "remaining_issues": [...], "guiding_question": "..." }`;

  const result = await chatJson<ConsensusOutput>({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.consensus_aid },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 700,
  });

  const common = (result.common ?? []).filter((x) => typeof x === 'string' && x.trim());
  const remaining = (result.remaining_issues ?? []).filter((x) => typeof x === 'string' && x.trim());
  const q = (result.guiding_question ?? '').trim();

  if (common.length + remaining.length === 0 && !q) {
    return { ok: false, reason: 'empty_consensus' };
  }

  const parts: string[] = ['🤝 합의에 가까워지고 있어요'];
  if (common.length) parts.push('공통점\n' + common.map((x) => `• ${x}`).join('\n'));
  if (remaining.length) parts.push('남은 쟁점\n' + remaining.map((x) => `• ${x}`).join('\n'));
  if (q) parts.push(`💬 함께 이야기해볼 질문\n${q}`);
  const combined = parts.join('\n\n');

  const mod = await moderate(combined);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  const v = validateOutput('consensus_aid', combined);
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: 'team',
    feature: 'consensus_aid',
    content: combined,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}
