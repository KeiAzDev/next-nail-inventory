// src/lib/session-manager.ts
import { prisma } from './prisma'
import type { PrismaClient } from '@prisma/client'
import { SessionError } from './errors'

type PrismaTransactionMethods = '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
type TransactionClient = Omit<PrismaClient, PrismaTransactionMethods>

interface SessionInfo {
  device?: string
  ipAddress?: string
}

export class SessionManager {
  private readonly storeId: string
  private readonly ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000 // 5分
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000    // 24時間
  private readonly STORE_SESSION_LIMIT = 50
  private readonly USER_SESSION_LIMIT = 5

  constructor(storeId: string) {
    this.storeId = storeId
  }

  async createSession(userId: string, info?: SessionInfo) {
    try {
      console.log('Creating session for user:', userId)
      
      // 古いセッションをクリーンアップ
      await this.cleanupOldSessions(userId)
      
      const token = await this.generateSecureToken()

      return await prisma.$transaction(async (tx) => {
        const [storeCount, userCount] = await Promise.all([
          this.getStoreActiveSessions(tx),
          this.getUserActiveSessions(tx, userId)
        ])

        console.log('Active sessions:', {
          storeCount,
          userCount,
          storeLimit: this.STORE_SESSION_LIMIT,
          userLimit: this.USER_SESSION_LIMIT
        })

        if (storeCount >= this.STORE_SESSION_LIMIT) {
          const error = new SessionError(
            '店舗の最大接続数に達しました',
            'SESSION_LIMIT_EXCEEDED',
            429
          )
          console.error('Store session limit exceeded:', error)
          throw error
        }

        // ユーザーセッション数のチェック（クリーンアップ後の再チェック）
        if (userCount >= this.USER_SESSION_LIMIT) {
          console.warn('User has reached session limit, cleaning up old sessions')
          
          // クリーンアップ後の再チェック
          const updatedUserCount = await this.getUserActiveSessions(tx, userId)
          if (updatedUserCount >= this.USER_SESSION_LIMIT) {
            const error = new SessionError(
              'ユーザーの最大接続数に達しました。他のデバイスからログアウトしてください。',
              'USER_SESSION_LIMIT_EXCEEDED',
              429
            )
            console.error('User session limit exceeded:', error)
            throw error
          }
        }

        const session = await tx.userSession.create({
          data: {
            userId,
            storeId: this.storeId,
            token,
            device: info?.device,
            ipAddress: info?.ipAddress,
            expiresAt: new Date(Date.now() + this.SESSION_DURATION),
            isActive: true,
            lastActivity: new Date()
          }
        })

        console.log('Session created:', session)
        return session
      })
    } catch (error) {
      console.error('Session creation error:', {
        error,
        userId,
        storeId: this.storeId
      })
      
      if (error instanceof SessionError) {
        throw error
      }
      throw new SessionError(
        'セッションの作成に失敗しました',
        'INVALID_SESSION',
        500
      )
    }
  }

  async validateSession(token: string): Promise<boolean> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { token }
      })

      if (!session || !session.isActive) {
        return false
      }

      if (session.expiresAt < new Date()) {
        await this.deactivateSession(token)
        return false
      }

      // アクティビティの更新と有効期限の延長
      const lastActivityThreshold = new Date(Date.now() - this.ACTIVITY_UPDATE_THRESHOLD)
      if (session.lastActivity < lastActivityThreshold) {
        await prisma.userSession.update({
          where: { token },
          data: { 
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + this.SESSION_DURATION)
          }
        })
      }

      return true
    } catch (error) {
      console.error('Session validation error:', error)
      return false
    }
  }

  async invalidateSession(token: string): Promise<void> {
    try {
      await this.deactivateSession(token)
    } catch (error) {
      console.error('Session invalidation error:', error)
      throw new SessionError(
        'セッションの無効化に失敗しました',
        'INVALID_SESSION',
        500
      )
    }
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      await prisma.userSession.updateMany({
        where: {
          userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      })
    } catch (error) {
      console.error('User sessions invalidation error:', error)
      throw new SessionError(
        'ユーザーセッションの無効化に失敗しました',
        'INVALID_SESSION',
        500
      )
    }
  }

  private async cleanupOldSessions(userId: string): Promise<void> {
    try {
      // アクティブなセッションを取得（最終アクティビティの降順）
      const activeSessions = await prisma.userSession.findMany({
        where: {
          userId,
          isActive: true
        },
        orderBy: {
          lastActivity: 'desc'
        }
      })

      // 最新の2つ以外のセッションを無効化
      if (activeSessions.length > 4) {
        const sessionsToDeactivate = activeSessions.slice(4)
        await prisma.userSession.updateMany({
          where: {
            id: {
              in: sessionsToDeactivate.map(session => session.id)
            }
          },
          data: {
            isActive: false
          }
        })
      }
    } catch (error) {
      console.error('Session cleanup error:', error)
    }
  }

  private async generateSecureToken(): Promise<string> {
    try {
      const array = new Uint8Array(32)
      crypto.getRandomValues(array)
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.error('Token generation error:', error)
      throw new SessionError(
        'セキュアトークンの生成に失敗しました',
        'INVALID_SESSION',
        500
      )
    }
  }

  private async getStoreActiveSessions(tx: TransactionClient): Promise<number> {
    return tx.userSession.count({
      where: {
        storeId: this.storeId,
        isActive: true
      }
    })
  }

  private async getUserActiveSessions(tx: TransactionClient, userId: string): Promise<number> {
    return tx.userSession.count({
      where: {
        userId,
        isActive: true
      }
    })
  }

  private async deactivateSession(token: string) {
    await prisma.userSession.update({
      where: { token },
      data: { isActive: false }
    })
  }
}