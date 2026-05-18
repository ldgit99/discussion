import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 학습 이벤트를 learning_events 테이블에 기록.
 * 서버 사이드(Route Handler, Server Action)에서만 호출. service_role 사용.
 * 실패는 silently 처리 (분석 데이터 누락보다 메인 기능 동작이 우선).
 */
export type LearningEventType =
  | 'message_send'
  | 'opinion_create'
  | 'opinion_update'
  | 'opinion_delete'
  | 'board_create'
  | 'board_update'
  | 'board_delete'
  | 'mode_switch_to_team'
  | 'mode_switch_to_personal'
  | 'share_personal_to_team'
  | 'ai_button_click'
  | 'ai_trigger_auto'
  | 'ai_message_posted'
  | 'consensus_submit'
  | 'room_join'
  | 'room_leave'
  | 'silence_detected'
  | 'attitude_flagged';

export async function emitEvent(opts: {
  eventType: LearningEventType;
  roomId?: string | null;
  sessionId?: string | null;
  actorId?: string | null;
  actorNickname?: string | null;
  channel?: string | null;
  targetObjectId?: string | null;
  aiFeature?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('learning_events').insert({
      event_type: opts.eventType,
      room_id: opts.roomId ?? null,
      session_id: opts.sessionId ?? null,
      actor_id: opts.actorId ?? null,
      actor_nickname: opts.actorNickname ?? null,
      channel: opts.channel ?? null,
      target_object_id: opts.targetObjectId ?? null,
      ai_feature: opts.aiFeature ?? null,
      payload: opts.payload ?? null,
    });
  } catch (e) {
    console.error('[analytics] emit failed', { type: opts.eventType, error: e });
  }
}

/**
 * AI 메시지에 대한 자동 follow-up 감지:
 * AI 메시지 게시 후 30초 내 학생 발화가 있으면 'follow_up_utterance' 반응 기록.
 *
 * 호출 위치: AI 메시지 insert 직후 + 일정 시간 후 cron job 또는 client trigger
 * (지금은 lib/ai/insert-message.ts에서 30초 setTimeout으로 처리하는 것보다
 *  주기적 batch job이 더 안전 — 일단 미구현, 추후 확장)
 */
export async function recordAiReaction(opts: {
  aiMessageId: string;
  roomId: string;
  participantId?: string | null;
  reaction: 'used_in_consensus' | 'follow_up_utterance';
  notes?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('ai_message_reactions').insert({
      ai_message_id: opts.aiMessageId,
      room_id: opts.roomId,
      participant_id: opts.participantId ?? null,
      reaction: opts.reaction,
      detected_by: 'auto',
      notes: opts.notes ?? null,
    });
  } catch (e) {
    console.error('[analytics] reaction failed', { error: e });
  }
}
