// src/lib/errors.ts
export type SessionErrorCode = 
  | 'STORE_LIMIT_EXCEEDED'        // システム全体の店舗数制限超過
  | 'STORE_USER_LIMIT_EXCEEDED'   // 店舗あたりのユーザー数制限超過
  | 'INVALID_SESSION'             // 無効なセッション
  | 'SESSION_LIMIT_EXCEEDED'      // 後方互換性のため維持
  | 'USER_SESSION_LIMIT_EXCEEDED' // 後方互換性のため維持

export class SessionError extends Error {
  constructor(
    message: string,
    public code: SessionErrorCode,
    public status: number = 401
  ) {
    super(message)
    this.name = 'SessionError'
  }
}