// /src/app/api/system-admin/auth/verify-mfa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemAdminAuth, AdminSessionInfo } from '@/lib/system-admin/auth'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tempToken, mfaCode } = body

    if (!tempToken || !mfaCode) {
      return NextResponse.json(
        { error: '一時トークンとMFAコードが必要です', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // IPアドレスの取得
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '0.0.0.0'
    
    // ユーザーエージェントの取得
    const userAgent = request.headers.get('user-agent') || undefined

    // セッション情報の構築
    const sessionInfo: AdminSessionInfo = {
      ipAddress,
      userAgent
    }

    // MFA検証とセッション作成
    const auth = new SystemAdminAuth()
    const result = await auth.verifyMfaAndComplete(tempToken, mfaCode, sessionInfo)

    return NextResponse.json(result)
  } catch (error) {
    console.error('MFA verification error:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'MFA検証中にエラーが発生しました', code: 'AUTH_ERROR' },
      { status: 500 }
    )
  }
}