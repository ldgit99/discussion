import { createClient } from '@/lib/supabase/server';
import { JoinForm } from './join-form';

// design.md §13.2 — 방 코드 입력 화면
export default async function JoinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName = user?.email?.split('@')[0] ?? '친구';

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-12 bg-neutral-50">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900">
            안녕하세요, {displayName}님!
          </h1>
          <p className="text-base text-neutral-600">
            선생님이 알려준 방 코드를 입력해주세요.
          </p>
        </header>

        <JoinForm />
      </div>
    </main>
  );
}
