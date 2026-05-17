import { createClient } from '@/lib/supabase/server';

/**
 * AI 호출자가 해당 방의 참가자인지 검증.
 * - 학생: participants 테이블 매칭
 * - 교사: rooms.teacher_id 매칭
 */
export async function authorizeAiCall(roomId: string): Promise<
  | { ok: true; userId: string; role: 'student' | 'teacher' }
  | { ok: false; status: number; reason: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, reason: 'not_authenticated' };

  const role = (user.user_metadata?.role as string) ?? 'student';

  if (role === 'teacher') {
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .eq('teacher_id', user.id)
      .maybeSingle();
    if (!room) return { ok: false, status: 403, reason: 'not_room_teacher' };
    return { ok: true, userId: user.id, role: 'teacher' };
  }

  // student
  const { data: part } = await supabase
    .from('participants')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!part) return { ok: false, status: 403, reason: 'not_room_participant' };
  return { ok: true, userId: user.id, role: 'student' };
}
