import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeAiCall } from '@/lib/ai/authorize';
import { runCompare } from '@/lib/ai/features/compare';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({ roomId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const auth = await authorizeAiCall(parsed.data.roomId);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const admin = createAdminClient();
  const { data: opinions } = await admin
    .from('opinions')
    .select('author_nickname, content, evidence')
    .eq('room_id', parsed.data.roomId)
    .order('created_at', { ascending: true });

  const result = await runCompare({
    roomId: parsed.data.roomId,
    opinions: (opinions ?? []).map((o) => ({
      nickname: (o as { author_nickname: string }).author_nickname,
      content: (o as { content: string }).content,
      evidence: (o as { evidence: string | null }).evidence,
    })),
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  return NextResponse.json({ message_id: result.messageId });
}
