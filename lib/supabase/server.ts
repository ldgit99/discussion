import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
// TODO: supabase gen types 후 <Database> 제네릭 추가

type CookieEntry = { name: string; value: string; options?: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieEntry[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieEntry) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출된 경우 — 미들웨어가 세션 갱신 담당
          }
        },
      },
    }
  );
}
