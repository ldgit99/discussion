import { chat } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';

/**
 * 개인 코칭 — 개인 채널 전용. 다른 학생 의견/닉네임 절대 누설 금지.
 * CLAUDE.md C3 + C2 (개인 코칭 가드)
 *
 * 재시도 정책: 가드 검증 실패 시 1회 더 시도 (지시 강화).
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
  const utterances = opts.myUtterances.slice(-10);
  const hasContext = utterances.some((u) => u.trim().length >= 2);
  const ctx = hasContext
    ? utterances.map((u, i) => `${i + 1}. ${u}`).join('\n')
    : '(아직 발화 없음)';

  const basePrompt = hasContext
    ? `학생 본인(${opts.myNickname})의 발화만 보고 사고를 확장할 수 있는 질문을 1-2개 만들어라.
- 명료화·반론 자극·근거 보완 중 하나.
- 다른 학생 의견·닉네임을 절대 언급하지 마라 (해당 정보 없음).
- 학생을 대신해 답을 쓰지 마라.

본인 발화:
${ctx}`
    : `학생 본인(${opts.myNickname})이 개인 채팅을 막 열었어요. 아직 의미 있는 발화가 없습니다.
오늘 토의에서 어떤 점을 깊이 생각해보고 싶은지 묻는 짧고 친근한 환영 질문 1개를 만들어라.`;

  async function attempt(reinforcement = ''): Promise<string> {
    return chat({
      messages: [
        { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.coaching },
        {
          role: 'user',
          content:
            basePrompt +
            '\n\n반드시 한국어 물음표(?)로 끝나는 문장이어야 한다.' +
            reinforcement,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });
  }

  // 1차 시도
  let raw = await attempt();
  let mod = await moderate(raw);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  let v = validateOutput('coaching', raw, {
    studentNicknames: opts.otherStudentNicknames,
    isPersonal: true,
  });

  // 가드 실패 시 1회 재시도 (지시 강화)
  if (!v.ok && v.reason === 'must_end_with_question') {
    raw = await attempt('\n응답 마지막 글자는 반드시 ? 부호여야 한다. 평서문 금지.');
    mod = await moderate(raw);
    if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };
    v = validateOutput('coaching', raw, {
      studentNicknames: opts.otherStudentNicknames,
      isPersonal: true,
    });
  }

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
