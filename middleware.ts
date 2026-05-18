import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/extension'); // Chrome extension không cần auth

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  // Login page redirect: AppShell/login page handles super admin → /admin logic
  if (user && pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // /admin: accessible to authenticated users; layout.tsx enforces super admin check
  // /api/admin: same — layout and API routes check is_super_admin via DB

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
