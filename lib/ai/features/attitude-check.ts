import { chat } from '../provider';
import { SYSTEM_HEADER, FEATURE_GUARDS, validateOutput } from '../guards';
import { moderate } from '../moderation';
import { insertAiMessage } from '../insert-message';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 태도 점검 — 표현 자체에 대한 대안 제시. 학생 인격 평가 금지.
 *
 * 2가지 호출 모드:
 *   - 학생 명시 호출: 최근 모둠 발화 전체를 보고 표현 개선 안내
 *   - 시스템 자동 호출: 특정 메시지의 비방 표현 감지 시 → attitude_flags 기록 + 부드러운 환기
 */

export async function runAttitudeCheck(opts: {
  roomId: string;
  flaggedMessageText?: string; // 자동 호출 시 감지된 텍스트
  flaggedMessageId?: string; // 자동 호출 시 메시지 id
  flaggedAuthorParticipantId?: string; // 자동 호출 시 작성자
  detectedBy?: 'keyword' | 'moderation_api' | 'manual';
}): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  const isAutoFlag = !!opts.flaggedMessageText;

  const userPrompt = isAutoFlag
    ? `방금 모둠에서 다음 표현이 감지됐어요:
"${opts.flaggedMessageText}"

이 표현 자체에 대해 부드럽게 환기하는 짧은 안내를 1-2문장으로 만들어라.
- 작성자를 호명·비난하지 마라.
- 의견을 평가하지 마라.
- "표현"에 대한 대안 제시 톤으로.`
    : `최근 모둠 토의에서 존중 표현이 부족한 부분이 있다면 부드럽게 환기해라.
없다면 "모두 서로 잘 듣고 있어요" 같은 짧은 응원 1문장.`;

  const raw = await chat({
    messages: [
      { role: 'system', content: SYSTEM_HEADER + '\n\n' + FEATURE_GUARDS.attitude_check },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 200,
  });

  const mod = await moderate(raw);
  if (!mod.ok) return { ok: false, reason: `moderation:${mod.reason}` };

  const v = validateOutput('attitude_check', raw);
  if (!v.ok) return { ok: false, reason: `guard:${v.reason}` };

  // 자동 호출이면 attitude_flags에 기록 (service_role)
  if (isAutoFlag) {
    const admin = createAdminClient();
    await admin.from('attitude_flags').insert({
      room_id: opts.roomId,
      target_participant_id: opts.flaggedAuthorParticipantId ?? null,
      message_id: opts.flaggedMessageId ?? null,
      severity: 'low',
      raw_text: opts.flaggedMessageText ?? '',
      detected_by: opts.detectedBy ?? 'keyword',
      action_taken: 'ai_message_posted',
    });
  }

  const inserted = await insertAiMessage({
    roomId: opts.roomId,
    channel: 'team',
    feature: 'attitude_check',
    content: '💛 ' + raw,
  });
  if (!inserted) return { ok: false, reason: 'db_insert' };

  return { ok: true, messageId: inserted.id };
}
