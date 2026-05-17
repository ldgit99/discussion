import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// 루트 — 인증 상태에 따라 자동 분기
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.user_metadata?.role ?? 'student';
  redirect(role === 'teacher' ? '/teacher' : '/join');
}
