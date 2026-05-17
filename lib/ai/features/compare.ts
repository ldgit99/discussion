import { chatJson } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

type CompareOutput = {
  common_points: string[];
  differences: string[];
  criteria: string[];
};

export async function runCompare(opts: {
  roomId: string;
  opinions: Array<{ nickname: string; content: string; evidence?: string | null }>;
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  if (opts.opinions.length < 2) {
    return { ok: false, reason: 'need_at_least_2_opinions' };
  }

  const opinionsText = opts.opinions
    .map((o, i) => `${i + 1}. ${o.nickname}: ${o.content}`)
    .join('\n');

  const result = await chatJson<CompareOutput>({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.compare },
      {
        role: 'user',
        content: `다음 의견들의 공통점·차이점·비교 기준만 정리해라. 어느 의견이 낫다는 평가 금지.

의견:
${opinionsText}

JSON 형식: { "common_points": [...], "differences": [...], "criteria": [...] }`,
      },
    ],
    temperature: 0.3,
    max_tokens: 700,
  });

  const common = (result.common_points ?? []).filter((x) => typeof x === 'string' && x.trim());
  const diff = (result.differences ?? []).filter((x) => typeof x === 'string' && x.trim());
  const crit = (result.criteria ?? []).filter((x) => typeof x === 'string' && x.trim());

  if (common.length + diff.length + crit.length === 0) {
    return { ok: false, reason: 'empty_compare' };
  }

  const parts: string[] = [];
  if (common.length) parts.push('🤝 공통점\n' + common.map((x) => `• ${x}`).join('\n'));
  if (diff.length) parts.push('🔀 차이점\n' + diff.map((x) => `• ${x}`).join('\n'));
  if (crit.length) parts.push('📐 비교해볼 기준\n' + crit.map((x) => `• ${x}`).join('\n'));
  const combined = parts.join('\n\n');

  const mod = await moderate(combined);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  const v = validateOutput('compare', combined);
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: 'team',
    feature: 'compare',
    content: combined,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}
