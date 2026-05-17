import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeAiCall } from '@/lib/ai/authorize';
import { runQuestionGen } from '@/lib/ai/features/question-gen';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  roomId: z.string().uuid(),
  channel: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const auth = await authorizeAiCall(parsed.data.roomId);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const admin = createAdminClient();
  const [{ data: room }, { data: msgs }] = await Promise.all([
    admin.from('rooms').select('topic').eq('id', parsed.data.roomId).maybeSingle(),
    admin
      .from('messages')
      .select('content')
      .eq('room_id', parsed.data.roomId)
      .eq('channel', 'team')
      .eq('message_type', 'utterance')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (!room) return NextResponse.json({ error: 'room_not_found' }, { status: 404 });
  const topic = (room as { topic: string }).topic;
  const recent = ((msgs ?? []) as { content: string }[]).map((m) => m.content).reverse();

  const result = await runQuestionGen({
    roomId: parsed.data.roomId,
    channel: parsed.data.channel ?? 'team',
    topic,
    recentUtterances: recent,
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  return NextResponse.json({ message_id: result.messageId });
}
