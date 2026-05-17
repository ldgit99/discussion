import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/logout-button';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const role = user.user_metadata?.role ?? 'student';

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <nav className="h-14 px-6 lg:px-8 border-b border-neutral-200 bg-neutral-0 flex items-center justify-between">
        <Link
          href={role === 'teacher' ? '/teacher' : '/join'}
          className="text-xl font-bold text-neutral-900"
        >
          토론모임
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-600 hidden sm:inline">
            {role === 'teacher' ? '교사' : '학생'} · {user.email}
          </span>
          <LogoutButton />
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
