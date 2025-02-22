// src/lib/system-admin/test-middleware.ts
/**
 * システム管理者ミドルウェアのテストユーティリティ
 * 
 * 使用方法:
 * 1. `npm run dev`でサーバーを起動
 * 2. 別のターミナルで`npx ts-node -r tsconfig-paths/register src/lib/system-admin/test-middleware.ts`を実行
 */
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const ADMIN_KEY = 'admin-e26a5d4c-3517-48f5-8c0f-322ce5f35ac6';

// レスポンス型の定義
interface LoginResponse {
  success?: boolean;
  token?: string;
  tempToken?: string;
  requiresMfa?: boolean;
  riskScore?: number;
  error?: string;
  code?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

async function testMiddleware() {
  console.log('========= システム管理者ミドルウェアテスト =========');
  
  // テストケース1: 認証なしでのログインAPIアクセス（成功するはず）
  try {
    console.log('\nテストケース1: ログインAPI（認証なし）を実行中...');
    const loginResponse = await fetch(`${BASE_URL}/api/system-admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: ADMIN_KEY }),
    });
    
    console.log('ステータス:', {
      status: loginResponse.status,
      ok: loginResponse.ok,
    });
    
    const loginData = await loginResponse.json() as LoginResponse;
    console.log('レスポンス:', loginData);

    // 認証トークンの取得（成功した場合）
    if (loginData.token || loginData.tempToken) {
      const token = loginData.token || loginData.tempToken;
    if (token) { // nullチェックを追加
      console.log('認証トークン:', token.substring(0, 10) + '...');
    } else {
      console.log('認証トークンが取得できませんでした');
    }
    }
  } catch (error) {
    console.error('テストケース1失敗:', error);
  }
  
  // テストケース2: 認証トークンなしでの保護されたAPIアクセス（失敗するはず）
  try {
    console.log('\nテストケース2: 保護されたAPI（認証なし）を実行中...');
    const protectedResponse = await fetch(`${BASE_URL}/api/system-admin/monitoring/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('ステータス:', {
      status: protectedResponse.status,
      ok: protectedResponse.ok,
    });
    
    const protectedData = await protectedResponse.json() as ErrorResponse;
    console.log('レスポンス:', protectedData);
  } catch (error) {
    console.error('テストケース2失敗:', error);
  }
  
  // テストケース3: 無効なトークンでの保護されたAPIアクセス（失敗するはず）
  try {
    console.log('\nテストケース3: 保護されたAPI（無効なトークン）を実行中...');
    const invalidTokenResponse = await fetch(`${BASE_URL}/api/system-admin/monitoring/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'invalid-token',
      },
    });
    
    console.log('ステータス:', {
      status: invalidTokenResponse.status,
      ok: invalidTokenResponse.ok,
    });
    
    const invalidTokenData = await invalidTokenResponse.json() as ErrorResponse;
    console.log('レスポンス:', invalidTokenData);
  } catch (error) {
    console.error('テストケース3失敗:', error);
  }
  
  console.log('\n========= テスト完了 =========');
}

testMiddleware();