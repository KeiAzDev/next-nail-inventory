// src/app/api/system-admin/ip-management/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IPManager } from '@/lib/system-admin/ip-manager';
import { SystemAdminError } from '@/lib/system-admin/errors';
import { getToken } from 'next-auth/jwt';

/**
 * 共通: 管理者認証の検証
 */
async function validateAdminAuth(request: NextRequest): Promise<{ isValid: boolean; error?: NextResponse }> {
  // IPアドレスを取得
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   '0.0.0.0';

  // 管理者トークンを検証
  const adminToken = request.headers.get('x-admin-token');
  if (!adminToken) {
    const response = NextResponse.json(
      { 
        error: 'システム管理者認証が必要です',
        code: 'UNAUTHORIZED' 
      },
      { status: 401 }
    );
    return { isValid: false, error: response };
  }

  // トークン検証
  try {
    const validateResponse = await fetch(new URL('/api/system-admin/auth/validate', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: adminToken,
        ipAddress
      })
    });

    if (!validateResponse.ok) {
      const response = NextResponse.json(
        { 
          error: '無効なセッションです',
          code: 'INVALID_SESSION'
        },
        { status: 401 }
      );
      return { isValid: false, error: response };
    }

    return { isValid: true };
  } catch (error) {
    console.error('管理者認証検証エラー:', error);
    const response = NextResponse.json(
      { 
        error: '認証検証中にエラーが発生しました',
        code: 'AUTH_ERROR'
      },
      { status: 500 }
    );
    return { isValid: false, error: response };
  }
}

/**
 * GET: 許可IPリストを取得
 */
export async function GET(request: NextRequest) {
  try {
    // IPアドレスを取得 (優先順位: x-forwarded-for > x-real-ip > リモートアドレス)
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     '0.0.0.0';

    console.log('IP管理APIアクセス:', {
      method: 'GET',
      url: request.nextUrl.pathname,
      ipAddress
    });

    // 管理者トークンを検証
    const adminToken = request.headers.get('x-admin-token');
    if (!adminToken) {
      return NextResponse.json(
        { 
          error: 'システム管理者認証が必要です',
          code: 'UNAUTHORIZED' 
        },
        { status: 401 }
      );
    }

    // トークン検証 (ミドルウェアで既に検証済みだが、念のため)
    const validateResponse = await fetch(new URL('/api/system-admin/auth/validate', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: adminToken,
        ipAddress
      })
    });

    if (!validateResponse.ok) {
      return NextResponse.json(
        { 
          error: '無効なセッションです',
          code: 'INVALID_SESSION'
        },
        { status: 401 }
      );
    }

    // IPマネージャーを初期化
    const ipManager = IPManager.getInstance();
    
    // 許可IPリストを取得
    const allowedIps = await ipManager.getAllowedIps();

    return NextResponse.json({ 
      allowedIps,
      count: allowedIps.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('IP管理API エラー (GET):', error);
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 許可IPを追加
 */
export async function POST(request: NextRequest) {
  try {
    // IPアドレスを取得
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     '0.0.0.0';

    console.log('IP管理APIアクセス:', {
      method: 'POST',
      url: request.nextUrl.pathname,
      ipAddress
    });

    // 管理者認証を検証
    const authResult = await validateAdminAuth(request);
    if (!authResult.isValid) {
      return authResult.error;
    }

    // リクエストボディを取得
    const body = await request.json();
    
    // バリデーション
    if (!body.ip) {
      return NextResponse.json(
        { 
          error: 'IPアドレスは必須です',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // IPマネージャーを初期化
    const ipManager = IPManager.getInstance();
    
    // IPアドレス形式の検証
    if (!ipManager.isValidIpOrCidr(body.ip)) {
      return NextResponse.json(
        { 
          error: '無効なIPアドレスまたはCIDR形式です',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    // 許可IPを追加
    const result = await ipManager.addAllowedIp(body.ip, body.label);

    return NextResponse.json({ 
      success: result,
      message: '許可IPを追加しました',
      ip: body.ip,
      label: body.label || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('IP管理API エラー (POST):', error);
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 許可IPを削除
 */
export async function DELETE(request: NextRequest) {
  try {
    // IPアドレスを取得
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     '0.0.0.0';

    console.log('IP管理APIアクセス:', {
      method: 'DELETE',
      url: request.nextUrl.pathname,
      ipAddress
    });

    // 管理者認証を検証
    const authResult = await validateAdminAuth(request);
    if (!authResult.isValid) {
      return authResult.error;
    }

    // リクエストボディを取得
    const body = await request.json();
    
    // バリデーション
    if (!body.ip) {
      return NextResponse.json(
        { 
          error: 'IPアドレスは必須です',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // 現在のIPアドレスの削除を防止
    if (body.ip === ipAddress) {
      return NextResponse.json(
        { 
          error: '現在使用中のIPアドレスは削除できません',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // IPマネージャーを初期化
    const ipManager = IPManager.getInstance();
    
    // 許可IPを削除
    const result = await ipManager.removeAllowedIp(body.ip);

    return NextResponse.json({ 
      success: result,
      message: result ? '許可IPを削除しました' : 'IPアドレスが見つかりませんでした',
      ip: body.ip,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('IP管理API エラー (DELETE):', error);
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}