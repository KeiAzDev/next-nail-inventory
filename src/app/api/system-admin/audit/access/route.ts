// /src/app/api/system-admin/audit/access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemAudit } from '@/lib/system-admin/audit'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 20
    
    // アクセス履歴の取得
    const audit = new SystemAudit()
    const logs = await audit.getAccessLogs(userId, limit)
    
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching access logs:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'アクセス履歴の取得中にエラーが発生しました', code: 'AUDIT_ERROR' },
      { status: 500 }
    )
  }
}