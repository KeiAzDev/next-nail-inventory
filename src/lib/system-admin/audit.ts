// /src/lib/system-admin/audit.ts
import { prisma } from '../prisma'

interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  ipAddress?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

interface AuditLogResult {
  logs: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class SystemAudit {
  // 監査ログの取得
  async getAuditLogs(filters: AuditLogFilter = {}): Promise<AuditLogResult> {
    try {
      const {
        userId,
        action,
        resource,
        ipAddress,
        fromDate,
        toDate,
        limit = 20,
        offset = 0
      } = filters;

      // ページ情報の計算
      const page = Math.floor(offset / limit) + 1;
      
      // フィルター条件の構築
      const where: any = {};
      
      if (userId) {
        where.userId = userId;
      }
      
      if (action) {
        where.action = action;
      }
      
      if (resource) {
        where.resource = resource;
      }
      
      if (ipAddress) {
        where.ipAddress = ipAddress;
      }
      
      if (fromDate || toDate) {
        where.createdAt = {};
        
        if (fromDate) {
          where.createdAt.gte = fromDate;
        }
        
        if (toDate) {
          where.createdAt.lte = toDate;
        }
      }
      
      // 合計件数の取得
      const total = await prisma.systemAuditLog.count({ where });
      
      // 監査ログの取得
      const logs = await prisma.systemAuditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      });
      
      // 結果の整形
      return {
        logs,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw new Error('監査ログの取得に失敗しました');
    }
  }
  
  // アクセス履歴の取得
  async getAccessLogs(userId?: string, limit: number = 20): Promise<any[]> {
    try {
      const where: any = {
        action: {
          in: ['ADMIN_LOGIN', 'ADMIN_LOGOUT', 'ADMIN_MFA_LOGIN']
        }
      };
      
      if (userId) {
        where.userId = userId;
      }
      
      return await prisma.systemAuditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
    } catch (error) {
      console.error('Error getting access logs:', error);
      throw new Error('アクセス履歴の取得に失敗しました');
    }
  }

  // 監査データのエクスポート機能
  async exportAuditData(filters: AuditLogFilter = {}): Promise<any> {
    try {
      // フィルターに基づいてログを取得（件数制限なし）
      const { userId, action, resource, ipAddress, fromDate, toDate } = filters;
      
      // フィルター条件の構築
      const where: any = {};
      
      if (userId) {
        where.userId = userId;
      }
      
      if (action) {
        where.action = action;
      }
      
      if (resource) {
        where.resource = resource;
      }
      
      if (ipAddress) {
        where.ipAddress = ipAddress;
      }
      
      if (fromDate || toDate) {
        where.createdAt = {};
        
        if (fromDate) {
          where.createdAt.gte = fromDate;
        }
        
        if (toDate) {
          where.createdAt.lte = toDate;
        }
      }
      
      const logs = await prisma.systemAuditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // エクスポート用にデータを整形
      const exportData = logs.map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        resource: log.resource,
        ipAddress: log.ipAddress,
        metadata: JSON.stringify(log.metadata),
        createdAt: log.createdAt.toISOString()
      }));
      
      return {
        data: exportData,
        timestamp: new Date().toISOString(),
        filters
      };
    } catch (error) {
      console.error('Error exporting audit data:', error);
      throw new Error('監査データのエクスポートに失敗しました');
    }
  }

  // 特定のアクションの監査ログを検索
  async searchActionLogs(action: string, limit: number = 100): Promise<any[]> {
    try {
      return await prisma.systemAuditLog.findMany({
        where: {
          action
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });
    } catch (error) {
      console.error(`Error searching action logs for ${action}:`, error);
      throw new Error('アクション履歴の検索に失敗しました');
    }
  }
}