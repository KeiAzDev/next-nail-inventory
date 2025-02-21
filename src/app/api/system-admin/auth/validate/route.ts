// /src/app/api/system-admin/auth/validate/route.ts
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

    // IPアドレスの取得
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '0.0.0.0'

    // トークン検証
    const auth = new SystemAdminAuth()
    const valid = await auth.validateSession(token, ipAddress)

    return NextResponse.json({ valid })
  } catch (error) {
    console.error('System admin token validation error:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'トークン検証中にエラーが発生しました', code: 'AUTH_ERROR' },
      { status: 500 }
    )
  }
}