// src/lib/system-admin/ip-manager.ts
import { prisma } from '../prisma';
import { SystemAdminError } from './errors';
import type { PrismaClient } from '@prisma/client';

// IP管理用の型定義
export interface IPAddress {
  value: string;   // IPアドレス値または CIDR表記
  label?: string;  // 説明ラベル (例: "オフィス", "自宅")
  createdAt: Date; // 追加日時
  lastUsed?: Date; // 最後に使用された日時
  isBlocked?: boolean; // ブロック状態
}

export interface GeoLocation {
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  accuracy?: number; // 精度（メートル）
}

export interface IPRiskScore {
  score: number;      // リスクスコア (0-100)
  factors: string[];  // リスク要因の配列
}

/**
 * IPアドレス管理モジュール
 * システム管理者の認証とセキュリティ向上のためのIPアドレス検証と管理を行う
 */
export class IPManager {
  private static instance: IPManager;
  // キャッシュ設定
  private cacheExpiry = 5 * 60 * 1000; // 5分
  private cachedAllowedIPs: { data: string[], timestamp: number } | null = null;
  private cachedBlockedIPs: { data: string[], timestamp: number } | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): IPManager {
    if (!IPManager.instance) {
      IPManager.instance = new IPManager();
    }
    return IPManager.instance;
  }

  /**
   * IPアドレスが許可リストに含まれているか検証
   * @param ip 検証するIPアドレス
   * @param adminKeyId 管理者キーID (オプション、指定がない場合は全データを検索)
   * @returns 許可されていればtrue、そうでなければfalse
   */
  public async isIpAllowed(ip: string, adminKeyId?: string): Promise<boolean> {
    console.log('IP許可チェック開始:', { ip, adminKeyId });
    
    // キャッシュがあれば利用
    if (this.cachedAllowedIPs && (Date.now() - this.cachedAllowedIPs.timestamp < this.cacheExpiry)) {
      const result = this.checkIpAgainstList(ip, this.cachedAllowedIPs.data);
      console.log('キャッシュからIP検証結果:', result);
      return result;
    }
    
    try {
      let adminKey;
      
      if (adminKeyId) {
        adminKey = await prisma.systemAdminKey.findUnique({
          where: { id: adminKeyId }
        });
      } else {
        adminKey = await prisma.systemAdminKey.findFirst();
      }
      
      if (!adminKey) {
        console.warn('管理者キーが見つかりません');
        return false;
      }
      
      // キャッシュを更新
      this.cachedAllowedIPs = {
        data: adminKey.allowedIPs,
        timestamp: Date.now()
      };
      
      return this.checkIpAgainstList(ip, adminKey.allowedIPs);
    } catch (error) {
      console.error('IPアドレス検証エラー:', error);
      return false;
    }
  }
  
  /**
   * IPアドレスをリストと照合
   * @param ip 検証するIPアドレス
   * @param ipList IPアドレスのリスト
   * @returns マッチすればtrue、そうでなければfalse
   */
  private checkIpAgainstList(ip: string, ipList: string[]): boolean {
    // 許可リストが空の場合は全て許可
    if (!ipList || ipList.length === 0) {
      console.log('許可リストが空のため、全IPを許可');
      return true;
    }
    
    // ワイルドカードチェック（全許可）
    if (ipList.includes('*')) {
      console.log('ワイルドカード指定により、全IPを許可');
      return true;
    }
    
    // 完全一致チェック
    if (ipList.includes(ip)) {
      console.log('IP完全一致');
      return true;
    }
    
    // CIDR表記のサブネットチェック
    for (const allowedIP of ipList) {
      if (allowedIP.includes('/')) {
        if (this.isIpInCidr(ip, allowedIP)) {
          console.log('CIDRマッチ:', allowedIP);
          return true;
        }
      }
    }
    
    console.log('IPアドレスが許可リストに含まれていません:', { ip, ipList });
    return false;
  }

  /**
   * IPアドレスがCIDR範囲内かチェック
   * @param ip 検証するIPアドレス
   * @param cidr CIDR表記 (例: "192.168.0.0/24")
   * @returns CIDR範囲内ならtrue、そうでなければfalse
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
      console.error('CIDRチェックエラー:', error);
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
   * 許可IPアドレスを追加
   * @param ip 追加するIPアドレスまたはCIDR
   * @param label 識別用ラベル (任意)
   * @param adminKeyId 管理者キーID (オプション)
   * @returns 処理結果
   */
  public async addAllowedIp(ip: string, label?: string, adminKeyId?: string): Promise<boolean> {
    try {
      // IPアドレスの形式を検証
      if (!this.isValidIpOrCidr(ip)) {
        throw new SystemAdminError(
          '無効なIPアドレスまたはCIDR形式です', 
          'VALIDATION_ERROR', 
          400
        );
      }
      
      // 管理者キーを取得
      let adminKey;
      if (adminKeyId) {
        adminKey = await prisma.systemAdminKey.findUnique({
          where: { id: adminKeyId }
        });
      } else {
        adminKey = await prisma.systemAdminKey.findFirst();
      }
      
      if (!adminKey) {
        throw new SystemAdminError(
          '管理者キーが見つかりません', 
          'RESOURCE_NOT_FOUND', 
          404
        );
      }
      
      // 重複チェック
      if (adminKey.allowedIPs.includes(ip)) {
        console.log('IPアドレスは既に許可リストに存在します:', ip);
        return true;
      }
      
      // IPアドレスを追加
      const updatedIPs = [...adminKey.allowedIPs, ip];
      
      await prisma.systemAdminKey.update({
        where: { id: adminKey.id },
        data: { allowedIPs: updatedIPs }
      });
      
      // 監査ログに記録
      await this.recordIpChange(adminKey.userId, 'IP_ALLOW_ADD', { ip, label });
      
      // キャッシュを無効化
      this.invalidateCache();
      
      console.log('許可IPアドレスを追加しました:', { ip, label });
      return true;
    } catch (error) {
      console.error('許可IPアドレス追加エラー:', error);
      if (error instanceof SystemAdminError) {
        throw error;
      }
      throw new SystemAdminError(
        'IPアドレス追加中にエラーが発生しました', 
        'VALIDATION_ERROR', 
        500
      );
    }
  }

  /**
   * 許可IPアドレスを削除
   * @param ip 削除するIPアドレスまたはCIDR
   * @param adminKeyId 管理者キーID (オプション)
   * @returns 処理結果
   */
  public async removeAllowedIp(ip: string, adminKeyId?: string): Promise<boolean> {
    try {
      // 管理者キーを取得
      let adminKey;
      if (adminKeyId) {
        adminKey = await prisma.systemAdminKey.findUnique({
          where: { id: adminKeyId }
        });
      } else {
        adminKey = await prisma.systemAdminKey.findFirst();
      }
      
      if (!adminKey) {
        throw new SystemAdminError(
          '管理者キーが見つかりません', 
          'RESOURCE_NOT_FOUND', 
          404
        );
      }
      
      // IPアドレスが存在するか確認
      if (!adminKey.allowedIPs.includes(ip)) {
        console.log('IPアドレスは許可リストに存在しません:', ip);
        return false;
      }
      
      // IPアドレスを削除
      const updatedIPs = adminKey.allowedIPs.filter(allowedIP => allowedIP !== ip);
      
      // 最低1つのIPアドレスは維持
      if (updatedIPs.length === 0) {
        throw new SystemAdminError(
          '少なくとも1つの許可IPアドレスを維持する必要があります', 
          'VALIDATION_ERROR', 
          400
        );
      }
      
      await prisma.systemAdminKey.update({
        where: { id: adminKey.id },
        data: { allowedIPs: updatedIPs }
      });
      
      // 監査ログに記録
      await this.recordIpChange(adminKey.userId, 'IP_ALLOW_REMOVE', { ip });
      
      // キャッシュを無効化
      this.invalidateCache();
      
      console.log('許可IPアドレスを削除しました:', ip);
      return true;
    } catch (error) {
      console.error('許可IPアドレス削除エラー:', error);
      if (error instanceof SystemAdminError) {
        throw error;
      }
      throw new SystemAdminError(
        'IPアドレス削除中にエラーが発生しました', 
        'VALIDATION_ERROR', 
        500
      );
    }
  }

  /**
   * 許可IPアドレスリストを取得
   * @param adminKeyId 管理者キーID (オプション)
   * @returns 許可IPアドレスリスト
   */
  public async getAllowedIps(adminKeyId?: string): Promise<string[]> {
    try {
      // キャッシュがあれば利用
      if (this.cachedAllowedIPs && (Date.now() - this.cachedAllowedIPs.timestamp < this.cacheExpiry)) {
        return this.cachedAllowedIPs.data;
      }
      
      // 管理者キーを取得
      let adminKey;
      if (adminKeyId) {
        adminKey = await prisma.systemAdminKey.findUnique({
          where: { id: adminKeyId }
        });
      } else {
        adminKey = await prisma.systemAdminKey.findFirst();
      }
      
      if (!adminKey) {
        return [];
      }
      
      // キャッシュを更新
      this.cachedAllowedIPs = {
        data: adminKey.allowedIPs,
        timestamp: Date.now()
      };
      
      return adminKey.allowedIPs;
    } catch (error) {
      console.error('許可IPアドレス取得エラー:', error);
      return [];
    }
  }

  /**
   * IPアドレスまたはCIDR形式の検証
   * @param ip 検証するIPアドレスまたはCIDR
   * @returns 有効ならtrue、そうでなければfalse
   */
  public isValidIpOrCidr(ip: string): boolean {
    // ワイルドカードの場合
    if (ip === '*') {
      return true;
    }
    
    // CIDR形式の場合
    if (ip.includes('/')) {
      const [ipPart, cidrPart] = ip.split('/');
      const cidrNum = parseInt(cidrPart, 10);
      
      // CIDRの範囲チェック (0-32)
      if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) {
        return false;
      }
      
      // IPパートの検証
      return this.isValidIpv4(ipPart);
    }
    
    // 通常のIPv4アドレス
    return this.isValidIpv4(ip);
  }

  /**
   * IPv4アドレスの検証
   * @param ip 検証するIPアドレス
   * @returns 有効ならtrue、そうでなければfalse
   */
  private isValidIpv4(ip: string): boolean {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * IPアドレス変更を監査ログに記録
   */
  private async recordIpChange(userId: string, action: string, info: any): Promise<void> {
    try {
      await prisma.systemAuditLog.create({
        data: {
          userId,
          action,
          resource: 'IP_MANAGEMENT',
          ipAddress: info.ip || '0.0.0.0',
          metadata: {
            ...info,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('監査ログ記録エラー:', error);
      // 監査ログのエラーはサイレントに処理
    }
  }

  /**
   * キャッシュを無効化
   */
  private invalidateCache(): void {
    this.cachedAllowedIPs = null;
    this.cachedBlockedIPs = null;
  }

  /**
   * IPアドレスのリスクスコアを評価
   * @param ip 評価するIPアドレス
   * @param geoLocation 位置情報 (オプション)
   * @returns リスクスコア情報
   */
  public async evaluateIpRisk(ip: string, geoLocation?: GeoLocation): Promise<IPRiskScore> {
    const factors: string[] = [];
    let score = 0;
    
    try {
      // 1. 許可リストチェック
      const isAllowed = await this.isIpAllowed(ip);
      if (!isAllowed) {
        score += 30;
        factors.push('not_in_allowed_list');
      }
      
      // 2. 過去のアクセス履歴チェック
      const accessHistory = await prisma.systemAuditLog.findMany({
        where: {
          ipAddress: ip,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 過去30日
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      });
      
      // 3. 過去の失敗アクセス数
      const failedAttempts = accessHistory.filter(log => 
        log.action === 'INVALID_LOGIN' || 
        log.action === 'SUSPICIOUS_ACCESS'
      ).length;
      
      if (failedAttempts > 0) {
        // 失敗アクセス数に応じてスコア加算 (最大25点)
        const failScore = Math.min(failedAttempts * 5, 25);
        score += failScore;
        factors.push('previous_failed_attempts');
      }
      
      // 4. 今回が初めてのアクセス
      if (accessHistory.length === 0) {
        score += 20;
        factors.push('first_time_access');
      }
      
      // 5. 地理情報分析 (オプション)
      if (geoLocation) {
        // 国コードベースのリスク評価 (実装例)
        if (geoLocation.country && this.isHighRiskCountry(geoLocation.country)) {
          score += 25;
          factors.push('high_risk_country');
        }
      }
      
      return {
        score,
        factors
      };
    } catch (error) {
      console.error('IPリスク評価エラー:', error);
      // エラー時は高リスクとして扱う
      return {
        score: 75,
        factors: ['evaluation_error']
      };
    }
  }

  /**
   * 高リスク国かどうかを判定
   * @param countryCode 国コード
   * @returns 高リスクならtrue
   */
  private isHighRiskCountry(countryCode: string): boolean {
    // 仮実装: 高リスク国のリスト (実際の実装ではデータベースや設定から読み込む)
    const highRiskCountries = ['XX', 'YY', 'ZZ']; // ダミーコード
    return highRiskCountries.includes(countryCode.toUpperCase());
  }
}