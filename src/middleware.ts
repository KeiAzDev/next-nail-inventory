import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 認証不要のパスを定義
  const publicPaths = ['/signin', '/signup']
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // セッショントークンのチェック
  const token = request.cookies.get('next-auth.session-token')
  
  if (!token) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}