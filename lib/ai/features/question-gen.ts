import { chatJson } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

type QuestionsOutput = { questions: string[] };

export async function runQuestionGen(opts: {
  roomId: string;
  channel?: 'team' | string;
  topic: string;
  recentUtterances: string[];
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  const recent = opts.recentUtterances.slice(-8);
  const ctx = recent.length
    ? recent.map((u, i) => `${i + 1}. ${u}`).join('\n')
    : '(최근 발화 없음)';

  const userPrompt = `토의 주제: "${opts.topic}"
최근 학생 발화:
${ctx}

학생들이 서로에게 물어볼 수 있는 짧은 질문을 2-3개 만들어라.
- 의견 내용에 대한 호기심 질문만 (인신공격·도발 금지).
- 특정 학생 호명 금지.
- 출력 형식: { "questions": ["...", "..."] }`;

  const result = await chatJson<QuestionsOutput>({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.question_gen },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 400,
  });

  const qs = (result.questions ?? []).filter((q) => typeof q === 'string' && q.trim());
  if (qs.length === 0) return { ok: false, reason: 'empty_questions' };

  const combined = `💬 함께 이야기해볼 질문\n` + qs.map((q) => `• ${q}`).join('\n');

  const mod = await moderate(combined);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  const v = validateOutput('question_gen', combined);
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: opts.channel ?? 'team',
    feature: 'question_gen',
    content: combined,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}
