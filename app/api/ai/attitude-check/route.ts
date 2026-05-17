import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeAiCall } from '@/lib/ai/authorize';
import { runAttitudeCheck } from '@/lib/ai/features/attitude-check';

const bodySchema = z.object({
  roomId: z.string().uuid(),
  flaggedMessageText: z.string().optional(),
  flaggedMessageId: z.string().uuid().optional(),
  flaggedAuthorParticipantId: z.string().uuid().optional(),
  detectedBy: z.enum(['keyword', 'moderation_api', 'manual']).optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const auth = await authorizeAiCall(parsed.data.roomId);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const result = await runAttitudeCheck({
    roomId: parsed.data.roomId,
    flaggedMessageText: parsed.data.flaggedMessageText,
    flaggedMessageId: parsed.data.flaggedMessageId,
    flaggedAuthorParticipantId: parsed.data.flaggedAuthorParticipantId,
    detectedBy: parsed.data.detectedBy,
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  return NextResponse.json({ message_id: result.messageId });
}
