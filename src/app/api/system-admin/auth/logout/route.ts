// /src/app/api/system-admin/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemAdminAuth } from '@/lib/system-admin/auth'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが指定されていません', code: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    // セッション無効化
    const auth = new SystemAdminAuth()
    await auth.invalidateSession(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('System admin logout error:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'ログアウト処理中にエラーが発生しました', code: 'AUTH_ERROR' },
      { status: 500 }
    )
  }
}