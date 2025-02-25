// src/app/api/system-admin/ip-management/risk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IPManager } from '@/lib/system-admin/ip-manager';
import { SystemAdminError } from '@/lib/system-admin/errors';

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
 * POST: IPアドレスのリスク評価
 */
export async function POST(request: NextRequest) {
  try {
    // IPアドレスを取得
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    '0.0.0.0';

    console.log('IPリスク評価APIアクセス:', {
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
          error: '無効なIPアドレス形式です',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    // 地理位置情報（オプション）
    const geoLocation = body.geoLocation ? {
      lat: body.geoLocation.lat,
      lng: body.geoLocation.lng,
      country: body.geoLocation.country,
      city: body.geoLocation.city,
    } : undefined;
    
    // リスク評価を実行
    const riskAssessment = await ipManager.evaluateIpRisk(body.ip, geoLocation);

    // リスクレベルを計算
    let riskLevel = 'low';
    if (riskAssessment.score > 70) {
      riskLevel = 'high';
    } else if (riskAssessment.score > 40) {
      riskLevel = 'medium';
    }

    // 結果を返す
    return NextResponse.json({ 
      ip: body.ip,
      riskScore: riskAssessment.score,
      riskLevel,
      factors: riskAssessment.factors,
      timestamp: new Date().toISOString(),
      isAllowed: await ipManager.isIpAllowed(body.ip)
    });
  } catch (error) {
    console.error('IPリスク評価API エラー:', error);
    
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