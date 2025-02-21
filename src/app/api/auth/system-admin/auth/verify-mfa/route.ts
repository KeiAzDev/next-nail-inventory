// src/app/api/system-admin/auth/verify-mfa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SystemAdminAuth } from '@/lib/system-admin/auth';
import { SystemAdminError } from '@/lib/system-admin/errors';

export async function POST(request: NextRequest) {
  try {
    const { tempToken, mfaCode } = await request.json();
    
    if (!tempToken || !mfaCode) {
      return NextResponse.json(
        { error: '一時トークンとMFAコードは必須です' },
        { status: 400 }
      );
    }

    const auth = new SystemAdminAuth();
    const sessionInfo = {
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  '0.0.0.0',
      userAgent: request.headers.get('user-agent') || undefined
    };
    
    const result = await auth.verifyMfaAndComplete(tempToken, mfaCode, sessionInfo);
    
    return NextResponse.json({
      success: true,
      token: result.token,
      expiresAt: result.expiresAt
    }, { status: 200 });
  } catch (error) {
    console.error('MFA verification error:', error);
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: 'MFA検証中にエラーが発生しました' },
      { status: 500 }
    );
  }
}