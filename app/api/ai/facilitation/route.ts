import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeAiCall } from '@/lib/ai/authorize';
import { runFacilitation } from '@/lib/ai/features/facilitation';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  roomId: z.string().uuid(),
  trigger: z.enum(['room_start', 'next_turn', 'evidence_request', 'respond']),
  nextNickname: z.string().optional(),
  lastUtterance: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const auth = await authorizeAiCall(parsed.data.roomId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  // 방 정보 + 참가자 닉네임 조회
  const admin = createAdminClient();
  const [{ data: room }, { data: parts }] = await Promise.all([
    admin.from('rooms').select('topic').eq('id', parsed.data.roomId).maybeSingle(),
    admin
      .from('participants')
      .select('nickname')
      .eq('room_id', parsed.data.roomId)
      .eq('role', 'student'),
  ]);

  if (!room) return NextResponse.json({ error: 'room_not_found' }, { status: 404 });
  const topic = (room as { topic: string }).topic;

  const result = await runFacilitation({
    roomId: parsed.data.roomId,
    topic,
    trigger: parsed.data.trigger,
    context: {
      nextNickname: parsed.data.nextNickname,
      lastUtterance: parsed.data.lastUtterance,
      participantNicknames: (parts ?? []).map((p) => (p as { nickname: string }).nickname),
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }
  return NextResponse.json({ message_id: result.messageId });
}
