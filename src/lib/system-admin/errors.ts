// src/lib/system-admin/errors.ts
export type SystemAdminErrorCode = 
  | 'INVALID_KEY'                 // 無効な認証キー
  | 'IP_RESTRICTED'               // IPアドレス制限
  | 'MAX_ATTEMPTS_EXCEEDED'       // 最大試行回数超過
  | 'AUTH_ERROR'                  // 認証処理エラー
  | 'INVALID_SESSION'             // 無効なセッション
  | 'ACCESS_DENIED'               // アクセス拒否
  | 'RESOURCE_NOT_FOUND'          // リソース未発見
  | 'VALIDATION_ERROR'            // バリデーションエラー
  | 'AUDIT_ERROR'                 // 監査ログエラー
  | 'MONITORING_ERROR'            // モニタリングエラー
  | 'INVALID_MFA'                 // 無効なMFAコード
  | 'INVALID_TOKEN';              // 無効なトークン

export class SystemAdminError extends Error {
  constructor(
    message: string,
    public code: SystemAdminErrorCode,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'SystemAdminError'
  }
}