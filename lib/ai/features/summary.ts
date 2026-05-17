import { chatJson } from '../provider';
import {
  SYSTEM_HEADER,
  FEATURE_GUARDS,
  validateOutput,
  originalRetentionRatio,
} from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

type SummaryOutput = { bullets: string[] };

export async function runSummary(opts: {
  roomId: string;
  opinions: Array<{ nickname: string; content: string; evidence?: string | null }>;
  recentUtterances?: string[];
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  if (opts.opinions.length === 0) {
    return { ok: false, reason: 'no_opinions' };
  }

  const opinionsText = opts.opinions
    .map((o, i) => `${i + 1}. ${o.nickname}: ${o.content}${o.evidence ? ` (근거: ${o.evidence})` : ''}`)
    .join('\n');

  const userPrompt = `다음 학생 의견들을 3-5개의 짧은 bullet로 정리해라.
원문 표현을 최대한 살리고, 없는 내용을 추가하지 마라.

의견:
${opinionsText}

JSON 형식: { "bullets": ["...", "..."] }`;

  const result = await chatJson<SummaryOutput>({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.summary },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  const bullets = (result.bullets ?? []).filter((b) => typeof b === 'string' && b.trim());
  if (bullets.length === 0) return { ok: false, reason: 'empty_summary' };

  const combined = bullets.map((b) => `• ${b}`).join('\n');

  // 모더레이션
  const mod = await moderate(combined);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  // 가드 검증
  const v = validateOutput('summary', combined);
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  // 원문 보존율
  const originals = opts.opinions.flatMap((o) => [o.content, o.evidence ?? '']).filter(Boolean);
  const ratio = originalRetentionRatio(combined, originals);
  if (ratio < 0.3) {
    return { ok: false, reason: `low_retention:${ratio.toFixed(2)}` };
  }

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: 'team',
    feature: 'summary',
    content: '📋 의견 정리\n' + combined,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}
