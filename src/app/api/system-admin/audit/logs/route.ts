// /src/app/api/system-admin/audit/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SystemAudit } from '@/lib/system-admin/audit'
import { SystemAdminError } from '@/lib/system-admin/errors'

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const ipAddress = searchParams.get('ipAddress') || undefined;
    const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate') as string) : undefined;
    const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate') as string) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') as string, 10) : 0;
    
    // フィルターの構築
    const filters = {
      userId,
      action,
      resource,
      ipAddress,
      fromDate,
      toDate,
      limit,
      offset
    };
    
    // 監査ログの取得
    const audit = new SystemAudit();
    const logs = await audit.getAuditLogs(filters);
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    
    if (error instanceof SystemAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: '監査ログの取得中にエラーが発生しました', code: 'AUDIT_ERROR' },
      { status: 500 }
    );
  }
}