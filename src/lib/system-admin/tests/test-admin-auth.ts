// src/lib/system-admin/tests/test-admin-auth.ts
import fetch from 'node-fetch';
// @ts-ignore
import dotenv from 'dotenv';

// 型定義
interface AuthResponse {
  token?: string;
  requiresMfa?: boolean;
  tempToken?: string;
  riskScore?: number;
  expiresAt?: string;
  error?: string;
  code?: string;
}

interface SessionStats {
  totalSessions?: number;
  activeSessions?: number;
  recentActivities?: number;
  byDevice?: Record<string, number>;
  byBrowser?: Record<string, number>;
  error?: string;
  code?: string;
}

// .envから環境変数を読み込む
dotenv.config();

async function testAdminAuth() {
  const adminKey = process.env.SYSTEM_ADMIN_KEY;
  
  if (!adminKey) {
    console.error('エラー: 環境変数SYSTEM_ADMIN_KEYが設定されていません。');
    return;
  }

  console.log('システム管理者認証テストを開始します...');
  
  try {
    // ベースURL
    const baseUrl = 'http://localhost:3000';
    
    // 1. 管理者ログイン
    console.log('1. 管理者ログインをテスト中...');
    const authResponse = await fetch(`${baseUrl}/api/system-admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: adminKey })
    });
    
    const authData = await authResponse.json() as AuthResponse;
    
    console.log('認証レスポンス:', authData);
    
    if (!authResponse.ok) {
      throw new Error(`認証エラー: ${JSON.stringify(authData)}`);
    }
    
    console.log('✅ 認証成功:', {
      status: authResponse.status,
      requiresMfa: authData.requiresMfa || false,
      tokenAvailable: !!authData.token
    });
    
    // MFAが必要な場合
    if (authData.requiresMfa) {
      console.log('MFA認証が必要です。MFAコードを入力してください。');
      // ここにMFAコード入力ロジックを追加
      return;
    }
    
    const token = authData.token;
    
    if (!token) {
      throw new Error('認証トークンが取得できませんでした');
    }
    
    // 2. セッション統計を取得
    console.log('\n2. セッション統計の取得をテスト中...');
    console.log('使用するトークン:', token);
    const statsResponse = await fetch(`${baseUrl}/api/system-admin/monitoring/sessions?period=day`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-admin-token': token
      }
    });
    
    const statsData = await statsResponse.json() as SessionStats;
    
    if (!statsResponse.ok) {
      throw new Error(`セッション統計取得エラー: ${JSON.stringify(statsData)}`);
    }
    
    console.log('✅ セッション統計取得成功:');
    console.log(`  - 総セッション数: ${statsData.totalSessions || 'N/A'}`);
    console.log(`  - アクティブセッション数: ${statsData.activeSessions || 'N/A'}`);
    console.log(`  - 最近のアクティビティ: ${statsData.recentActivities || 'N/A'}`);
    
    if (statsData.byDevice) {
      console.log('  - デバイス別統計:');
      Object.entries(statsData.byDevice).forEach(([device, count]) => {
        console.log(`    - ${device}: ${count}`);
      });
    }
    
    // 3. ログアウト
    console.log('\n3. ログアウトをテスト中...');
    const logoutResponse = await fetch(`${baseUrl}/api/system-admin/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token  // この時点でtokenは必ず存在することが保証されている
      }
    });
    
    if (!logoutResponse.ok) {
      const logoutData = await logoutResponse.json();
      throw new Error(`ログアウトエラー: ${JSON.stringify(logoutData)}`);
    }
    
    console.log('✅ ログアウト成功');
    
    console.log('\nすべてのテストが正常に完了しました！');
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  }
}

// テストを実行
testAdminAuth();