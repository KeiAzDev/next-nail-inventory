//middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 認証不要のパスを定義
  const publicPaths = ['/signin', '/signup', '/staff-signup']
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // セッショントークンのチェック
  const token = await getToken({ req: request })
  
  if (!token) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // ダッシュボードへのアクセスを/stores/[id]にリダイレクト
  if (pathname === '/dashboard') {
    if (token.storeId) {
      return NextResponse.redirect(new URL(`/stores/${token.storeId}`, request.url))
    } else {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  }

  // /stores/[id]へのアクセスをチェック
  if (pathname.startsWith('/stores/')) {
    const storeId = pathname.split('/')[2]
    if (token.storeId !== storeId && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/stores/${token.storeId}`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}