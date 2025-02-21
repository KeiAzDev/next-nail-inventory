// /src/lib/system-admin/monitoring.ts
import { prisma } from '../prisma'

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  recentActivities: number;
  byDevice?: Record<string, number>;
  byBrowser?: Record<string, number>;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  requestRate: number;
  errorRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

interface AnomalyDetection {
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
    details?: any;
  }>;
}

export class SystemMonitoring {
  // セッション統計を取得
  async getSessionStats(period: 'day' | 'week' | 'month' = 'day'): Promise<SessionStats> {
    try {
      // 期間の計算
      const periodStart = new Date();
      switch (period) {
        case 'day':
          periodStart.setDate(periodStart.getDate() - 1);
          break;
        case 'week':
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case 'month':
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
      }

      // 全セッション数
      const totalSessions = await prisma.systemAdminSession.count();
      
      // アクティブセッション数
      const activeSessions = await prisma.systemAdminSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });
      
      // 最近のアクティビティ
      const recentActivities = await prisma.systemAdminSession.count({
        where: {
          lastActivity: { gt: periodStart }
        }
      });

      // デバイス別統計（userAgentから推定）
      const sessions = await prisma.systemAdminSession.findMany({
        where: {
          createdAt: { gt: periodStart }
        },
        select: {
          userAgent: true
        }
      });

      const byDevice: Record<string, number> = {};
      const byBrowser: Record<string, number> = {};
      
      sessions.forEach(session => {
        if (session.userAgent) {
          // 簡易的なデバイス推定
          const device = this.extractDeviceInfo(session.userAgent);
          byDevice[device] = (byDevice[device] || 0) + 1;
          
          // 簡易的なブラウザ推定
          const browser = this.extractBrowserInfo(session.userAgent);
          byBrowser[browser] = (byBrowser[browser] || 0) + 1;
        }
      });

      return {
        totalSessions,
        activeSessions,
        recentActivities,
        byDevice,
        byBrowser
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw new Error('セッション統計の取得に失敗しました');
    }
  }

  // パフォーマンスメトリクスを取得
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // 実際のアプリケーションでは、より詳細なメトリクス収集を実装
      // 現在は簡易的な実装のみ
      
      // 監査ログから応答時間を推定（実際はより適切な方法で計測）
      const recentLogs = await prisma.systemAuditLog.findMany({
        where: {
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      });
      
      // 仮のレスポンスタイム（実際はメトリクス収集システムを使用）
      const avgResponseTime = 120; // ms
      
      // 24時間あたりのリクエスト数を推定
      const requestRate = recentLogs.length;
      
      // エラー率を推定（実際はより詳細に分析）
      const errorLogs = recentLogs.filter(log => 
        log.action.includes('ERROR') || 
        (log.metadata as any)?.hasError === true
      );
      const errorRate = requestRate > 0 ? (errorLogs.length / requestRate) * 100 : 0;

      return {
        avgResponseTime,
        requestRate,
        errorRate,
        // 実際の環境では、サーバーのCPU/メモリ使用状況も取得
        cpuUsage: undefined,
        memoryUsage: undefined
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw new Error('パフォーマンスメトリクスの取得に失敗しました');
    }
  }

  // 異常検知
  async detectAnomalies(): Promise<AnomalyDetection> {
    try {
      const anomalies: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
        timestamp: Date;
        details?: any;
      }> = [];
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // 1. ログイン失敗の異常検知
      const recentFailedLogins = await prisma.systemAuditLog.count({
        where: {
          action: 'ADMIN_LOGIN_FAILED',
          createdAt: { gt: oneDayAgo }
        }
      });
      
      if (recentFailedLogins > 5) {
        anomalies.push({
          type: 'login_failures',
          severity: recentFailedLogins > 10 ? 'high' : 'medium',
          message: `24時間以内に${recentFailedLogins}回のログイン失敗`,
          timestamp: now,
          details: { count: recentFailedLogins }
        });
      }
      
      // 2. 不審なIPアドレスからのアクセス検知
      const suspiciousAccessLogs = await prisma.systemAuditLog.count({
        where: {
          action: 'SUSPICIOUS_ACCESS',
          createdAt: { gt: oneDayAgo }
        }
      });
      
      if (suspiciousAccessLogs > 0) {
        anomalies.push({
          type: 'suspicious_access',
          severity: 'high',
          message: `24時間以内に${suspiciousAccessLogs}回の不審なアクセス`,
          timestamp: now,
          details: { count: suspiciousAccessLogs }
        });
      }
      
      // 3. 過剰なアクセス検知
      const activeSessionsCount = await prisma.systemAdminSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: now }
        }
      });
      
      if (activeSessionsCount > 10) {
        anomalies.push({
          type: 'high_session_count',
          severity: 'medium',
          message: `現在${activeSessionsCount}個のアクティブセッション`,
          timestamp: now,
          details: { count: activeSessionsCount }
        });
      }

      return { anomalies };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw new Error('異常検知に失敗しました');
    }
  }

  // User Agentからデバイス情報を抽出（簡易版）
  private extractDeviceInfo(userAgent: string): string {
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'iOS';
    } else if (userAgent.includes('Android')) {
      return 'Android';
    } else if (userAgent.includes('Windows')) {
      return 'Windows';
    } else if (userAgent.includes('Mac')) {
      return 'Mac';
    } else if (userAgent.includes('Linux')) {
      return 'Linux';
    }
    return 'Other';
  }

  // User Agentからブラウザ情報を抽出（簡易版）
  private extractBrowserInfo(userAgent: string): string {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edg')) {
      return 'Edge';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      return 'Internet Explorer';
    }
    return 'Other';
  }
}