import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeAiCall } from '@/lib/ai/authorize';
import { runCoaching } from '@/lib/ai/features/coaching';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  roomId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const auth = await authorizeAiCall(parsed.data.roomId);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });
  if (auth.role !== 'student') {
    return NextResponse.json({ error: 'students_only' }, { status: 403 });
  }

  // SSR client로 본인 participant 조회 (RLS 통과)
  const supabase = await createClient();
  const { data: me } = await supabase
    .from('participants')
    .select('id, nickname')
    .eq('room_id', parsed.data.roomId)
    .eq('user_id', auth.userId)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: 'not_participant' }, { status: 403 });

  const admin = createAdminClient();
  const myPart = me as { id: string; nickname: string };
  const personalChannel = `personal:${myPart.id}`;

  // 본인의 개인 채널 + 팀 채널 본인 발화 추출 (다른 학생 의견 비포함)
  const [{ data: personal }, { data: teamMine }, { data: otherParts }] = await Promise.all([
    admin
      .from('messages')
      .select('content, message_type')
      .eq('room_id', parsed.data.roomId)
      .eq('channel', personalChannel)
      .eq('message_type', 'utterance')
      .order('created_at', { ascending: true }),
    admin
      .from('messages')
      .select('content')
      .eq('room_id', parsed.data.roomId)
      .eq('channel', 'team')
      .eq('author_id', auth.userId)
      .order('created_at', { ascending: true }),
    admin
      .from('participants')
      .select('nickname')
      .eq('room_id', parsed.data.roomId)
      .eq('role', 'student')
      .neq('user_id', auth.userId),
  ]);

  const myUtterances = [
    ...((personal ?? []).map((r) => (r as { content: string }).content)),
    ...((teamMine ?? []).map((r) => (r as { content: string }).content)),
  ];

  const otherNicks = (otherParts ?? []).map((p) => (p as { nickname: string }).nickname);

  const result = await runCoaching({
    roomId: parsed.data.roomId,
    participantId: myPart.id,
    myNickname: myPart.nickname,
    myUtterances,
    otherStudentNicknames: otherNicks,
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  return NextResponse.json({ message_id: result.messageId });
}
