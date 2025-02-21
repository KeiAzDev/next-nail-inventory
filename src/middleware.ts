// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // システム管理者APIのパスをチェック
  if (pathname.startsWith('/api/system-admin')) {
    // ログインとMFA検証は認証なしでアクセス可能
    if (pathname === '/api/system-admin/auth/login' || 
        pathname === '/api/system-admin/auth/verify-mfa') {
      return NextResponse.next();
    }
    
    // それ以外のエンドポイントは認証が必要
    const adminToken = request.headers.get('x-admin-token');
    if (!adminToken) {
      return NextResponse.json(
        { error: 'システム管理者認証が必要です' },
        { status: 401 }
      );
    }
    
    try {
      // 内部APIを使用してトークンを検証
      const ipAddress = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        '0.0.0.0';
      
      const response = await fetch(new URL('/api/system-admin/auth/validate', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: adminToken,
          ipAddress
        })
      });
      
      const { valid } = await response.json();
      
      if (!valid) {
        return NextResponse.json(
          { error: 'システム管理者セッションが無効です' },
          { status: 401 }
        );
      }
      
      // 検証成功、リクエストを続行
      return NextResponse.next();
    } catch (error) {
      console.error('System admin session validation error in middleware:', error);
      return NextResponse.json(
        { error: 'セッション検証中にエラーが発生しました' },
        { status: 500 }
      );
    }
  }
  
  // 以下は既存のミドルウェア処理
  
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/api/:path*']
}