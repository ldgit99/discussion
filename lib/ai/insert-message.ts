import { createAdminClient } from '@/lib/supabase/admin';
import { emitEvent } from '@/lib/analytics/emit';
import type { AiFeature } from './guards';

/**
 * AI 메시지를 messages 테이블에 insert.
 * service_role 클라이언트로 RLS 우회 (학생 INSERT 정책은 utterance만 허용).
 * learning_events에 'ai_message_posted' 자동 emit.
 */
export async function insertAiMessage(opts: {
  roomId: string;
  channel: 'team' | string;
  feature: AiFeature;
  content: string;
  trigger?: 'student' | 'auto';
}): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  const messageType =
    opts.feature === 'coaching' ? 'ai_coaching' : 'ai_facilitation';

  const { data, error } = await admin
    .from('messages')
    .insert({
      room_id: opts.roomId,
      channel: opts.channel,
      author_id: null,
      author_nickname: opts.feature === 'coaching' ? 'AI 코치' : 'AI 진행자',
      content: opts.content,
      message_type: messageType,
      ai_feature: opts.feature,
    })
    .select('id, room_id')
    .single();

  if (error) {
    console.error('[ai] insert message failed', { feature: opts.feature, error });
    return null;
  }

  const inserted = data as { id: string; room_id: string };

  // 학습 이벤트 기록 (실패해도 main 흐름 영향 없음)
  // session_id는 별도 조회. 자주 호출되니 단순화: room_id로 가능.
  const { data: room } = await admin
    .from('rooms')
    .select('session_id')
    .eq('id', inserted.room_id)
    .maybeSingle();

  await emitEvent({
    eventType: 'ai_message_posted',
    roomId: inserted.room_id,
    sessionId: (room as { session_id: string } | null)?.session_id ?? null,
    channel: opts.channel,
    targetObjectId: inserted.id,
    aiFeature: opts.feature,
    payload: { trigger: opts.trigger ?? 'student', content_length: opts.content.length },
  });

  return { id: inserted.id };
}
