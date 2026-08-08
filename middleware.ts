import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { CSRF_COOKIE_NAME, generateCsrfToken, verifyCsrfToken } from '@/lib/security/csrf'

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: false,
})

function withCsrfCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.get(CSRF_COOKIE_NAME)) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const role = request.cookies.get('aframp_role')?.value
    if (role !== 'admin') {
      return withCsrfCookie(request, NextResponse.redirect(new URL('/dashboard', request.url)))
    }
    return withCsrfCookie(request, NextResponse.next())
  }

  if (!pathname.startsWith('/api/')) {
    return withCsrfCookie(request, NextResponse.next())
  }

  if (!verifyCsrfToken(request)) {
    return withCsrfCookie(
      request,
      NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 })
    )
  }

  let requestHeaders = request.headers

  if (pathname.startsWith('/api') && !isPublicApiRoute(pathname)) {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', session.sub)
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'

  const { success, limit, remaining, reset } = await ratelimit.limit(ip)

  if (!success) {
    return withCsrfCookie(
      request,
      NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      )
    )
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('X-RateLimit-Limit', String(limit))
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  response.headers.set('X-RateLimit-Reset', String(reset))
  return withCsrfCookie(request, response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
