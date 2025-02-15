// src/lib/errors.ts
export class SessionError extends Error {
  constructor(
    message: string,
    public code: 'SESSION_LIMIT_EXCEEDED' | 'USER_SESSION_LIMIT_EXCEEDED' | 'INVALID_SESSION',
    public status: number = 401
  ) {
    super(message)
    this.name = 'SessionError'
  }
}