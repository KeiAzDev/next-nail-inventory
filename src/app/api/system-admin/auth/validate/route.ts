// src/app/api/system-admin/auth/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemAdminAuth } from '@/lib/system-admin/auth'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function POST(request: NextRequest) {
  try {
    // リクエストボディのパース
    const body = await request.json()
    const { token, ipAddress } = body

    // バリデーション
    if (!token || !ipAddress) {
      console.warn('検証パラメータ不足:', { token: !!token, ipAddress: !!ipAddress })
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // Debug logs
    console.log('セッション検証リクエスト:', {
      token: token.substring(0, 10) + '...',
      ipAddress
    })

    // セッション検証
    const auth = new SystemAdminAuth()
    const isValid = await auth.validateSession(token, ipAddress)

    // 検証結果のログ
    console.log('セッション検証結果:', { isValid })

    if (!isValid) {
      return NextResponse.json(
        { error: 'システム管理者セッションが無効です' },
        { status: 401 }
      )
    }

    return NextResponse.json({ valid: true })

  } catch (error) {
    console.error('システム管理者セッション検証エラー:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'セッション検証中にエラーが発生しました' },
      { status: 500 }
    )
  }
}