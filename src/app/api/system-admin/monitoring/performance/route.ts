// /src/app/api/system-admin/monitoring/performance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemMonitoring } from '@/lib/system-admin/monitoring'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function GET(request: NextRequest) {
  try {
    // パフォーマンスメトリクスの取得
    const monitoring = new SystemMonitoring()
    const metrics = await monitoring.getPerformanceMetrics()
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'パフォーマンスメトリクスの取得中にエラーが発生しました', code: 'MONITORING_ERROR' },
      { status: 500 }
    )
  }
}