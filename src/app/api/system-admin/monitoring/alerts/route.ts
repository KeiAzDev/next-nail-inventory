// /src/app/api/system-admin/monitoring/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemMonitoring } from '@/lib/system-admin/monitoring'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function GET(request: NextRequest) {
  try {
    // 異常検知結果の取得
    const monitoring = new SystemMonitoring()
    const alerts = await monitoring.detectAnomalies()
    
    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error detecting anomalies:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: '異常検知中にエラーが発生しました', code: 'MONITORING_ERROR' },
      { status: 500 }
    )
  }
}