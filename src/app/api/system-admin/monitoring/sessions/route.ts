// /src/app/api/system-admin/monitoring/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemMonitoring } from '@/lib/system-admin/monitoring'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータから期間を取得
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'day'
    
    // セッション統計の取得
    const monitoring = new SystemMonitoring()
    const stats = await monitoring.getSessionStats(period)
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching session statistics:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'セッション統計の取得中にエラーが発生しました', code: 'MONITORING_ERROR' },
      { status: 500 }
    )
  }
}