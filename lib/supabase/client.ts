'use client';

import { createBrowserClient } from '@supabase/ssr';
// TODO: `supabase gen types typescript --linked > lib/db/types.ts` 후
//       <Database> 제네릭 추가 (현재 untyped — MVP 단계)
// import type { Database } from '@/lib/db/types';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
