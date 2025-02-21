// src/lib/system-admin/auth.ts
import { prisma } from '../prisma'
import bcrypt from 'bcryptjs'
import { SystemAdminError } from './errors'

export interface AdminSessionInfo {
  ipAddress: string;
  userAgent?: string;
  geoLocation?: {
    lat: number;
    lng: number;
  };
}

interface RiskAssessment {
  riskScore: number;
  requiresAdditionalAuth: boolean;
  allowAccess: boolean;
  factors: string[];
}

interface TempAuthData {
  key: string;
  userId: string;
  expires: Date;
  sessionInfo: AdminSessionInfo;
}

export class SystemAdminAuth {
  private readonly SESSION_DURATION = 4 * 60 * 60 * 1000;  // 4時間
  private readonly TEMP_TOKEN_DURATION = 10 * 60 * 1000;   // 10分（MFA用）
  private readonly MAX_ATTEMPTS = 5;
  private readonly ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000;  // 5分
  
  // メモリ内の一時トークンストア（本番では永続化が必要）
  private static tempTokenStore: Map<string, TempAuthData> = new Map();

  /**
   * システム管理者の認証を行います
   */
  async authenticate(key: string, sessionInfo: AdminSessionInfo, mfaCode?: string): Promise<any> {
    try {
      console.log('Attempting to authenticate system admin with IP:', sessionInfo.ipAddress);
      
      // 1. システム管理者キーを検索
      const adminKey = await prisma.systemAdminKey.findFirst({
        where: { key }
      });

      if (!adminKey) {
        console.warn('Invalid system admin key attempt from IP:', sessionInfo.ipAddress);
        throw new SystemAdminError('認証キーが無効です', 'INVALID_KEY', 401);
      }

      // 2. リスク評価
      const riskAssessment = await this.evaluateAccessRisk(adminKey, sessionInfo);
      console.log('Risk assessment result:', {
        userId: adminKey.userId,
        riskScore: riskAssessment.riskScore,
        requiresAdditionalAuth: riskAssessment.requiresAdditionalAuth,
        allowAccess: riskAssessment.allowAccess,
        factors: riskAssessment.factors
      });

      // 3. 試行回数のチェック
      if (adminKey.attempts >= this.MAX_ATTEMPTS) {
        console.warn('Max attempts exceeded for key ID:', adminKey.id);
        throw new SystemAdminError('試行回数の上限に達しました。システム管理者に連絡してください', 'MAX_ATTEMPTS_EXCEEDED', 429);
      }

      // 4. アクセス拒否判定
      if (!riskAssessment.allowAccess) {
        await this.recordFailedAttempt(adminKey.id);
        throw new SystemAdminError(
          'セキュリティリスクが高すぎるため認証できません', 
          'ACCESS_DENIED', 
          403
        );
      }

      // 5. 追加認証が必要な場合
      if (riskAssessment.requiresAdditionalAuth && !mfaCode) {
        // 一時トークンを生成してMFA検証を要求
        const tempToken = this.generateSecureToken();
        
        // 一時トークンを保存
        SystemAdminAuth.tempTokenStore.set(tempToken, {
          key,
          userId: adminKey.userId,
          expires: new Date(Date.now() + this.TEMP_TOKEN_DURATION),
          sessionInfo
        });
        
        return {
          requiresMfa: true,
          tempToken,
          riskScore: riskAssessment.riskScore,
          riskFactors: riskAssessment.factors
        };
      }

      // 6. MFA検証（必要な場合）
      if (riskAssessment.requiresAdditionalAuth && mfaCode) {
        const isValidMfa = await this.validateMfa(adminKey.userId, mfaCode);
        if (!isValidMfa) {
          await this.recordFailedAttempt(adminKey.id);
          throw new SystemAdminError('二段階認証コードが無効です', 'INVALID_MFA', 401); // ← 修正: エラーコード追加
        }
      }

      // 7. 認証成功、セッション作成
      const token = this.generateSecureToken();
      
      // 試行回数をリセット
      await prisma.systemAdminKey.update({
        where: { id: adminKey.id },
        data: { attempts: 0 }
      });

      // セッション作成
      const session = await prisma.systemAdminSession.create({
        data: {
          userId: adminKey.userId,
          token,
          ipAddress: sessionInfo.ipAddress,
          userAgent: sessionInfo.userAgent,
          isActive: true,
          expiresAt: new Date(Date.now() + this.SESSION_DURATION),
          lastActivity: new Date()
        }
      });

      // 監査ログに記録
      await this.recordAuditEvent(adminKey.userId, 'ADMIN_LOGIN', {
        ...sessionInfo,
        riskScore: riskAssessment.riskScore,
        riskFactors: riskAssessment.factors
      });
      
      console.log('System admin authenticated successfully. Session created:', session.id);
      return {
        token: session.token,
        expiresAt: session.expiresAt,
        riskScore: riskAssessment.riskScore
      };
    } catch (error) {
      console.error('System admin authentication error:', error);
      
      if (error instanceof SystemAdminError) {
        throw error;
      }
      
      throw new SystemAdminError(
        '認証処理中にエラーが発生しました',
        'AUTH_ERROR',
        500
      );
    }
  }

  /**
   * MFA検証を行い、成功時に完全なセッションを作成します
   */
  async verifyMfaAndComplete(tempToken: string, mfaCode: string, sessionInfo: AdminSessionInfo): Promise<any> {
    try {
      // 一時トークンの検証
      const tempData = SystemAdminAuth.tempTokenStore.get(tempToken);
      if (!tempData || tempData.expires < new Date()) {
        throw new SystemAdminError('一時トークンが無効または期限切れです', 'INVALID_TOKEN', 401); // ← 修正: エラーコード追加
      }

      // MFA検証
      const isValidMfa = await this.validateMfa(tempData.userId, mfaCode);
      if (!isValidMfa) {
        throw new SystemAdminError('二段階認証コードが無効です', 'INVALID_MFA', 401); // ← 修正: エラーコード追加
      }

      // 一時トークンを削除
      SystemAdminAuth.tempTokenStore.delete(tempToken);

      // セッション作成
      const token = this.generateSecureToken();
      const session = await prisma.systemAdminSession.create({
        data: {
          userId: tempData.userId,
          token,
          ipAddress: sessionInfo.ipAddress,
          userAgent: sessionInfo.userAgent,
          isActive: true,
          expiresAt: new Date(Date.now() + this.SESSION_DURATION),
          lastActivity: new Date()
        }
      });

      // 監査ログに記録
      await this.recordAuditEvent(tempData.userId, 'ADMIN_MFA_LOGIN', {
        ...sessionInfo,
        usedMfa: true
      });
      
      return {
        token: session.token,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      console.error('MFA verification error:', error);
      
      if (error instanceof SystemAdminError) {
        throw error;
      }
      
      throw new SystemAdminError(
        'MFA検証中にエラーが発生しました',
        'AUTH_ERROR',
        500
      );
    }
  }

  /**
   * セッショントークンの検証を行います
   */
  async validateSession(token: string, ipAddress: string): Promise<boolean> {
    try {
      const session = await prisma.systemAdminSession.findUnique({
        where: { token }
      });

      if (!session || !session.isActive) {
        return false;
      }

      if (session.expiresAt < new Date()) {
        await this.invalidateSession(token);
        return false;
      }

      // IPアドレスの確認 - セッションハイジャック防止
      if (session.ipAddress !== ipAddress) {
        console.warn('IP address mismatch for session:', session.id, 'Expected:', session.ipAddress, 'Got:', ipAddress);
        await this.invalidateSession(token);
        // ← 修正: metadata参照を避ける
        await this.recordAuditEvent(session.userId, 'SUSPICIOUS_ACCESS', { 
          ipAddress,
          originalIp: session.ipAddress,
          sessionId: session.id 
        });
        return false;
      }

      // アクティビティの更新
      if (this.shouldUpdateActivity(session.lastActivity)) {
        await prisma.systemAdminSession.update({
          where: { token },
          data: { 
            lastActivity: new Date()
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * セッションを無効化します
   */
  async invalidateSession(token: string): Promise<void> {
    try {
      const session = await prisma.systemAdminSession.findUnique({
        where: { token }
      });

      if (session) {
        await prisma.systemAdminSession.update({
          where: { token },
          data: { isActive: false }
        });

        // 監査ログに記録
        await this.recordAuditEvent(session.userId, 'ADMIN_LOGOUT', {
          ipAddress: session.ipAddress,
          userAgent: session.userAgent
        });
        
        console.log('System admin session invalidated:', session.id);
      }
    } catch (error) {
      console.error('Session invalidation error:', error);
      throw new SystemAdminError(
        'セッションの無効化に失敗しました',
        'INVALID_SESSION',
        500
      );
    }
  }

  /**
   * リスクスコアに基づいたアクセス検証
   */
  private async evaluateAccessRisk(adminKey: any, sessionInfo: AdminSessionInfo): Promise<RiskAssessment> {
    let riskScore = 0;
    const factors: string[] = [];
    
    // 1. 許可IPリストのチェック
    const isAllowedIp = this.isIpAllowed(sessionInfo.ipAddress, adminKey.allowedIPs);
    if (!isAllowedIp) {
      riskScore += 30;
      factors.push('unknown_ip');
    }
    
    // 2. 時間帯チェック
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour <= 18;
    if (!isBusinessHours) {
      riskScore += 20;
      factors.push('non_business_hours');
    }
    
    // 3. 過去のアクセスパターン分析
    const previousSessions = await prisma.systemAdminSession.findMany({
      where: {
        userId: adminKey.userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 過去30日
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    // 同じUserAgentを使用したことがあるか
    const hasSimilarUserAgent = previousSessions.some(
      session => session.userAgent && this.isSimilarUserAgent(session.userAgent, sessionInfo.userAgent || '')
    );
    if (!hasSimilarUserAgent && sessionInfo.userAgent) {
      riskScore += 15;
      factors.push('new_user_agent');
    }
    
    // 4. アクセス頻度の異常検知
    const last24HoursAccessCount = previousSessions.filter(
      session => session.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    if (last24HoursAccessCount > 10) { // 通常より多いアクセス
      riskScore += 20;
      factors.push('high_frequency_access');
    }
    
    // 5. 地理的位置の急激な変化（オプション）
    if (sessionInfo.geoLocation && previousSessions.length > 0) {
      // ← 修正: メタデータアクセス方法の変更
      const lastSession = previousSessions[0];
      // 以前の位置情報を監査ログから取得
      const lastLoginAudit = await prisma.systemAuditLog.findFirst({
        where: {
          userId: adminKey.userId,
          action: 'ADMIN_LOGIN'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (lastLoginAudit && lastLoginAudit.metadata) {
        try {
          const metadata = lastLoginAudit.metadata as any;
          if (metadata.geoLocation) {
            const impossibleTravel = this.detectImpossibleTravel(
              metadata.geoLocation,
              sessionInfo.geoLocation,
              lastSession.createdAt
            );
            
            if (impossibleTravel) {
              riskScore += 40;
              factors.push('impossible_travel');
            }
          }
        } catch (error) {
          console.error('Error processing location data:', error);
        }
      }
    }
    
    // リスクスコアの評価
    const requiresAdditionalAuth = riskScore > 40;
    const allowAccess = riskScore < 70;
    
    return { 
      riskScore, 
      requiresAdditionalAuth, 
      allowAccess,
      factors
    };
  }

  /**
   * MFA検証メソッド（実際の実装ではSMS/メール/認証アプリなど）
   */
  private async validateMfa(userId: string, mfaCode: string): Promise<boolean> {
    // 仮の実装: 特定のコードを許可
    // 実際の実装ではSMS、TOTP、メールなどを使用
    const debugMfaCode = "123456"; // 開発用（本番では使用しない）
    
    // TODO: 実際のMFA実装
    // 例: ワンタイムパスワード、SMSなど
    
    if (process.env.NODE_ENV === 'development' && mfaCode === debugMfaCode) {
      return true;
    }
    
    // 実際の検証ロジックをここに実装
    // 仮実装: 6桁の数字ならOK（デモ用）
    return /^\d{6}$/.test(mfaCode);
  }

  /**
   * 認証失敗を記録します
   */
  private async recordFailedAttempt(keyId: string): Promise<void> {
    try {
      // 試行回数を増加
      await prisma.systemAdminKey.update({
        where: { id: keyId },
        data: { attempts: { increment: 1 } }
      });
    } catch (error) {
      console.error('Failed to record authentication attempt:', error);
    }
  }

  /**
   * 監査イベントを記録します
   */
  private async recordAuditEvent(userId: string, action: string, info: any): Promise<void> {
    try {
      await prisma.systemAuditLog.create({
        data: {
          userId,
          action,
          ipAddress: info.ipAddress,
          metadata: {
            ...info,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to record audit event:', error);
      // 監査ログのエラーはサイレント
    }
  }

  /**
   * IPアドレスが許可リストに含まれているかを確認します
   */
  private isIpAllowed(ipAddress: string, allowedIPs: string[]): boolean {
    // 許可リストが空の場合は全て許可
    if (!allowedIPs || allowedIPs.length === 0) return true;
    
    // ワイルドカードチェック（全許可）
    if (allowedIPs.includes('*')) return true;
    
    // 完全一致チェック
    if (allowedIPs.includes(ipAddress)) return true;
    
    // CIDR表記のサブネットチェック
    for (const allowedIP of allowedIPs) {
      if (allowedIP.includes('/')) {
        if (this.isIpInCidr(ipAddress, allowedIP)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * IPアドレスがCIDR範囲内かチェックします
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      const [subnet, bits] = cidr.split('/');
      const mask = parseInt(bits, 10);
      
      // IPv4のみサポート
      const ipNum = this.ipToInt(ip);
      const subnetNum = this.ipToInt(subnet);
      const maskNum = this.cidrMaskToInt(mask);
      
      return (ipNum & maskNum) === (subnetNum & maskNum);
    } catch (error) {
      console.error('CIDR check error:', error);
      return false;
    }
  }

  /**
   * IPv4アドレスを整数に変換
   */
  private ipToInt(ip: string): number {
    return ip.split('.').reduce((sum, octet) => (sum << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * CIDRマスクを整数に変換
   */
  private cidrMaskToInt(bits: number): number {
    return ~(2 ** (32 - bits) - 1) >>> 0;
  }

  /**
   * アクティビティの更新が必要かを判断します
   */
  private shouldUpdateActivity(lastActivity: Date): boolean {
    return new Date(lastActivity.getTime() + this.ACTIVITY_UPDATE_THRESHOLD) < new Date();
  }

  /**
   * セキュアなトークンを生成します
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * ユーザーエージェントの類似性を検証
   */
  private isSimilarUserAgent(stored: string, current: string): boolean {
    // 主要なブラウザ情報のみで比較（OSやバージョン細部は無視）
    const normalize = (ua: string) => {
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return ua.substring(0, 20); // 簡易比較
    };
    
    return normalize(stored) === normalize(current);
  }
  
  /**
   * 物理的に不可能な移動を検出
   */
  private detectImpossibleTravel(
    prevLocation: {lat: number, lng: number},
    currentLocation: {lat: number, lng: number},
    prevTime: Date
  ): boolean {
    const distance = this.calculateDistance(
      prevLocation.lat, prevLocation.lng,
      currentLocation.lat, currentLocation.lng
    );
    
    const hoursSinceLast = (Date.now() - prevTime.getTime()) / (1000 * 60 * 60);
    const maxPossibleSpeed = 1000; // km/h (飛行機速度より大きい値)
    
    return distance / hoursSinceLast > maxPossibleSpeed;
  }
  
  /**
   * 二点間の距離を計算（Haversine公式）
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 地球の半径（km）
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}