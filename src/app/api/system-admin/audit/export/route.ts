// /src/app/api/system-admin/audit/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemAudit } from '@/lib/system-admin/audit'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function POST(request: NextRequest) {
  try {
    // リクエストボディからフィルター条件を取得
    const body = await request.json()
    const { 
      userId, 
      action, 
      resource, 
      ipAddress, 
      fromDate, 
      toDate 
    } = body
    
    // 日付文字列をDate型に変換
    const fromDateObj = fromDate ? new Date(fromDate) : undefined
    const toDateObj = toDate ? new Date(toDate) : undefined
    
    // フィルターの構築
    const filters = {
      userId,
      action,
      resource,
      ipAddress,
      fromDate: fromDateObj,
      toDate: toDateObj
    }
    
    // 監査データのエクスポート
    const audit = new SystemAudit()
    const exportData = await audit.exportAuditData(filters)
    
    return NextResponse.json(exportData)
  } catch (error) {
    console.error('Error exporting audit data:', error)
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: '監査データのエクスポート中にエラーが発生しました', code: 'AUDIT_ERROR' },
      { status: 500 }
    )
  }
}