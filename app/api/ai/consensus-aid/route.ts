import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeAiCall } from '@/lib/ai/authorize';
import { runConsensusAid } from '@/lib/ai/features/consensus-aid';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({ roomId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const auth = await authorizeAiCall(parsed.data.roomId);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const admin = createAdminClient();
  const [{ data: opinions }, { data: boardItems }] = await Promise.all([
    admin
      .from('opinions')
      .select('author_nickname, content, evidence')
      .eq('room_id', parsed.data.roomId)
      .order('created_at', { ascending: true }),
    admin
      .from('board_items')
      .select('type, content')
      .eq('room_id', parsed.data.roomId)
      .order('type', { ascending: true }),
  ]);

  const boardSummary = (boardItems ?? [])
    .map((b) => {
      const r = b as { type: string; content: string };
      return `[${r.type}] ${r.content}`;
    })
    .filter((s) => s.length > 5)
    .join('\n');

  const result = await runConsensusAid({
    roomId: parsed.data.roomId,
    opinions: (opinions ?? []).map((o) => ({
      nickname: (o as { author_nickname: string }).author_nickname,
      content: (o as { content: string }).content,
      evidence: (o as { evidence: string | null }).evidence,
    })),
    boardSummary: boardSummary || undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  return NextResponse.json({ message_id: result.messageId });
}
