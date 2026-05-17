import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoomClient } from './room-client';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: room } = await supabase
    .from('rooms')
    .select('id, session_id, topic, room_code, stage, max_participants, time_limit_minutes')
    .eq('id', id)
    .maybeSingle();

  if (!room) notFound();

  // 본인 참여 확인 (교사도 접근 가능)
  const role = (user.user_metadata?.role as string) ?? 'student';
  if (role === 'student') {
    const { data: myPart } = await supabase
      .from('participants')
      .select('id, nickname')
      .eq('room_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!myPart) redirect('/join');
  }

  const nickname =
    (user.user_metadata?.nickname as string) ?? user.email?.split('@')[0] ?? '익명';

  return (
    <RoomClient
      roomId={room.id}
      sessionId={room.session_id}
      topic={room.topic}
      roomCode={room.room_code}
      stage={room.stage}
      maxParticipants={room.max_participants}
      timeLimitMinutes={room.time_limit_minutes}
      myUserId={user.id}
      myNickname={nickname}
    />
  );
}
