// src/app/api/system-admin/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SystemAdminAuth } from '@/lib/system-admin/auth';
import { SystemAdminError } from '@/lib/system-admin/errors';

export async function POST(request: NextRequest) {
  try {
    const { key, mfaCode } = await request.json();
    
    if (!key) {
      return NextResponse.json(
        { error: '認証キーは必須です' },
        { status: 400 }
      );
    }

    const auth = new SystemAdminAuth();
    const sessionInfo = {
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  '0.0.0.0',
      userAgent: request.headers.get('user-agent') || undefined,
      // オプション: ジオロケーション情報（クライアント側から提供される場合）
      geoLocation: request.headers.get('x-geo-location') 
        ? JSON.parse(request.headers.get('x-geo-location') || '{}') 
        : undefined
    };

    const result = await auth.authenticate(key, sessionInfo, mfaCode);
    
    // MFA要求の場合
    if (result.requiresMfa) {
      return NextResponse.json({
        requiresMfa: true,
        tempToken: result.tempToken,
        riskScore: result.riskScore,
        message: '追加認証が必要です'
      }, { status: 200 });
    }
    
    // 認証成功
    return NextResponse.json({
      success: true,
      token: result.token,
      expiresAt: result.expiresAt,
      riskScore: result.riskScore || 0
    }, { status: 200 });
  } catch (error) {
    console.error('System admin login error:', error);
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}