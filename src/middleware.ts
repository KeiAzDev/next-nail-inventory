// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 1. パブリックパスの定義と早期チェック
  const publicPaths = [
    '/signin',
    '/signup',
    '/_next',
    '/api/auth',
    '/favicon.ico',
    '/api/system-admin/auth/login',
    '/api/system-admin/auth/verify-mfa',
    '/api/system-admin/auth/validate'  // 検証APIを追加
  ]
  
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 2. システム管理者APIのパスをチェック
  if (pathname.startsWith('/api/system-admin')) {
    const adminToken = request.headers.get('x-admin-token')
    if (!adminToken) {
      return NextResponse.json(
        { error: 'システム管理者認証が必要です' },
        { status: 401 }
      )
    }

    try {
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       '0.0.0.0'
      
      // 検証APIを使用
      const validateResponse = await fetch(new URL('/api/system-admin/auth/validate', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: adminToken,
          ipAddress
        })
      })
      
      if (!validateResponse.ok) {
        const errorData = await validateResponse.json()
        return NextResponse.json(
          { error: errorData.error || 'システム管理者セッションが無効です' },
          { status: validateResponse.status }
        )
      }

      return NextResponse.next()
    } catch (error) {
      console.error('System admin session validation error:', error)
      return NextResponse.json(
        { error: 'セッション検証中にエラーが発生しました' },
        { status: 500 }
      )
    }
  }

  // 3. staff-signupのアクセス制御
  if (pathname === '/staff-signup') {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
    return NextResponse.next()
  }

  // 4. 通常のセッション検証
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  if (!token?.sessionToken || !token?.storeId) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // 5. セッション検証をAPI経由で実行
  try {
    const validateResponse = await fetch(new URL('/api/auth/validate', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token.sessionToken,
        storeId: token.storeId
      })
    })

    const { isValid } = await validateResponse.json()
    
    if (!isValid) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // 6. ダッシュボードリダイレクト
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(`/stores/${token.storeId}`, request.url))
  }

  // 7. 店舗アクセス権限のチェック
  if (pathname.startsWith('/stores/')) {
    const storeId = pathname.split('/')[2]
    if (token.storeId !== storeId && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/stores/${token.storeId}`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*'
  ]
}