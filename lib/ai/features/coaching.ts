import { chat } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

/**
 * 개인 코칭 — 개인 채널 전용. 다른 학생 의견/닉네임 절대 누설 금지.
 * CLAUDE.md C3 + C2 (개인 코칭 가드)
 */
export async function runCoaching(opts: {
  roomId: string;
  participantId: string;
  myNickname: string;
  /** 본인의 최근 발화 (다른 학생 발화는 절대 포함 금지) */
  myUtterances: string[];
  /** 같은 모둠 다른 학생 닉네임 (누설 검증용) */
  otherStudentNicknames: string[];
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  const utterances = opts.myUtterances.slice(-10); // 최근 10개만
  const ctx = utterances.length
    ? utterances.map((u, i) => `${i + 1}. ${u}`).join('\n')
    : '(아직 발화 없음)';

  const userPrompt = `학생 본인(${opts.myNickname})의 발화만 보고 사고를 확장할 수 있는 질문을 1-2개 만들어라.
- 명료화·반론 자극·근거 보완 중 하나.
- 다른 학생 의견·닉네임을 절대 언급하지 마라 (해당 정보 없음).
- 학생을 대신해 답을 쓰지 마라.
- 출력은 질문 형태로 끝나야 한다.

본인 발화:
${ctx}`;

  const raw = await chat({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.coaching },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 300,
  });

  const mod = await moderate(raw);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  // 누설 검증: 다른 학생 닉네임이 출력에 포함되면 차단
  const v = validateOutput('coaching', raw, {
    studentNicknames: opts.otherStudentNicknames,
    isPersonal: true,
  });
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: `personal:${opts.participantId}`,
    feature: 'coaching',
    content: raw,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}
