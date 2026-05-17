import { createClient } from '@supabase/supabase-js';

/**
 * Service role 클라이언트 — RLS 우회. AI 메시지 insert 등 서버 사이드에서만 사용.
 * 절대 클라이언트 코드(components, app/(...) 클라이언트 파일)에서 import 금지.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin credentials missing in env');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
