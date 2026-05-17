import { createAdminClient } from '@/lib/supabase/admin';
import type { AiFeature } from './guards';

/**
 * AI 메시지를 messages 테이블에 insert.
 * service_role 클라이언트로 RLS 우회 (학생 INSERT 정책은 utterance만 허용).
 */
export async function insertAiMessage(opts: {
  roomId: string;
  channel: 'team' | string; // 'personal:{pid}' for 4주차
  feature: AiFeature;
  content: string;
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
    .select('id')
    .single();

  if (error) {
    console.error('[ai] insert message failed', { feature: opts.feature, error });
    return null;
  }
  return data as { id: string };
}
