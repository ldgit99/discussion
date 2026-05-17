'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isPending}>
      로그아웃
    </Button>
  );
}
