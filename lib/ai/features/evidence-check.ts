import { chatJson } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

type EvidenceOutput = { questions: string[] };

export async function runEvidenceCheck(opts: {
  roomId: string;
  opinion: { nickname: string; content: string; evidence?: string | null };
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  const hasEvidence = !!opts.opinion.evidence && opts.opinion.evidence.trim().length > 0;

  const userPrompt = `학생 의견: ${opts.opinion.content}
${hasEvidence ? `근거: ${opts.opinion.evidence}` : '근거: (없음)'}

이 의견의 근거를 보완하기 위해 학생에게 물어볼 짧은 질문을 1-2개 만들어라.
질문은 모두 물음표(?)로 끝나야 한다. 근거를 대신 작성하지 마라.

JSON 형식: { "questions": ["...", "..."] }`;

  const result = await chatJson<EvidenceOutput>({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.evidence_check },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 400,
  });

  const qs = (result.questions ?? []).filter((q) => typeof q === 'string' && q.trim());
  if (qs.length === 0) return { ok: false, reason: 'empty_questions' };

  const combined = `🔍 근거를 더 명확히 해볼까요? (${opts.opinion.nickname}님 의견)\n` +
    qs.map((q) => `• ${q}`).join('\n');

  const mod = await moderate(combined);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  const v = validateOutput('evidence_check', combined);
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: 'team',
    feature: 'evidence_check',
    content: combined,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}
