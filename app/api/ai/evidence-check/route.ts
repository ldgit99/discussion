import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeAiCall } from '@/lib/ai/authorize';
import { runEvidenceCheck } from '@/lib/ai/features/evidence-check';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  roomId: z.string().uuid(),
  opinionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const auth = await authorizeAiCall(parsed.data.roomId);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const admin = createAdminClient();
  const { data: op } = await admin
    .from('opinions')
    .select('author_nickname, content, evidence, room_id')
    .eq('id', parsed.data.opinionId)
    .maybeSingle();

  if (!op || (op as { room_id: string }).room_id !== parsed.data.roomId) {
    return NextResponse.json({ error: 'opinion_not_found' }, { status: 404 });
  }

  const result = await runEvidenceCheck({
    roomId: parsed.data.roomId,
    opinion: {
      nickname: (op as { author_nickname: string }).author_nickname,
      content: (op as { content: string }).content,
      evidence: (op as { evidence: string | null }).evidence,
    },
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  return NextResponse.json({ message_id: result.messageId });
}
