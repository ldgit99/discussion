import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
// TODO: supabase gen types 후 <Database> 제네릭 추가

type CookieEntry = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieEntry[]) {
          cookiesToSet.forEach(({ name, value }: CookieEntry) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieEntry) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 토큰 갱신 + 사용자 조회
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/design') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public') ||
    pathname.includes('.');

  // 미인증 + 비공개 페이지 접근 → /login으로
  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 인증됨 + 인증 페이지 접근 → 역할별 홈으로
  if (user && isAuthPage) {
    const role = user.user_metadata?.role ?? 'student';
    const url = request.nextUrl.clone();
    url.pathname = role === 'teacher' ? '/teacher' : '/join';
    return NextResponse.redirect(url);
  }

  // 역할 기반 라우트 가드
  if (user) {
    const role = user.user_metadata?.role ?? 'student';
    if (pathname.startsWith('/teacher') && role !== 'teacher') {
      const url = request.nextUrl.clone();
      url.pathname = '/join';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
