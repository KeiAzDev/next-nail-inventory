// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 認証不要のパスを定義
  const publicPaths = ['/signin', '/signup']
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // staff-signupのアクセス制御
  if (pathname === '/staff-signup') {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
    return NextResponse.next()
  }

  // セッショントークンのチェック
  const token = await getToken({ req: request })
  
  if (!token?.sessionToken || !token?.storeId) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // セッション検証をAPI経由で実行
  try {
    const response = await fetch(new URL('/api/auth/validate', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token.sessionToken,
        storeId: token.storeId
      })
    })

    const { isValid } = await response.json()
    
    if (!isValid) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // ダッシュボードへのアクセスを/stores/[id]にリダイレクト
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(`/stores/${token.storeId}`, request.url))
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