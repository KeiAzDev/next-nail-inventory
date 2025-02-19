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
  private readonly ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000  // 5分
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000     // 24時間
  private readonly MAX_CONNECTED_STORES = 50                  // システム全体での最大店舗数
  private readonly MAX_USERS_PER_STORE = 5                   // 1店舗あたりの最大ユーザー数

  constructor(storeId: string) {
    this.storeId = storeId
  }

  async createSession(userId: string, info?: SessionInfo) {
    try {
      console.log('Creating session for user:', userId, 'in store:', this.storeId)
      
      // 古いセッションをクリーンアップ
      await this.cleanupOldSessions(userId)
      
      const token = await this.generateSecureToken()

      return await prisma.$transaction(async (tx) => {
        // システム全体での接続店舗数をチェック
        const connectedStores = await this.getConnectedStoresCount(tx)
        console.log('Connected stores:', connectedStores, 'of', this.MAX_CONNECTED_STORES)

        if (connectedStores >= this.MAX_CONNECTED_STORES) {
          const error = new SessionError(
            'システムの最大接続店舗数に達しました',
            'STORE_LIMIT_EXCEEDED',
            429
          )
          console.error('System-wide store limit exceeded:', error)
          throw error
        }

        // 店舗あたりのアクティブユーザー数をチェック
        const activeStoreUsers = await this.getActiveStoreUsersCount(tx, this.storeId)
        console.log('Active users in store:', activeStoreUsers, 'of', this.MAX_USERS_PER_STORE)

        if (activeStoreUsers >= this.MAX_USERS_PER_STORE) {
          const error = new SessionError(
            'この店舗の最大接続ユーザー数に達しました',
            'STORE_USER_LIMIT_EXCEEDED',
            429
          )
          console.error('Store user limit exceeded:', error)
          throw error
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

        console.log('Session created successfully:', {
          sessionId: session.id,
          userId,
          storeId: this.storeId
        })
        
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

  private async getConnectedStoresCount(tx: TransactionClient): Promise<number> {
    const connectedStores = await tx.userSession.groupBy({
      by: ['storeId'],
      where: {
        isActive: true
      }
    })
    return connectedStores.length
  }

  private async getActiveStoreUsersCount(tx: TransactionClient, storeId: string): Promise<number> {
    const activeUsers = await tx.userSession.groupBy({
      by: ['userId'],
      where: {
        storeId,
        isActive: true
      }
    })
    return activeUsers.length
  }

  private async cleanupOldSessions(userId: string): Promise<void> {
    try {
      // 期限切れまたは非アクティブなセッションをクリーンアップ
      await prisma.userSession.updateMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { expiresAt: { lt: new Date() } },
            { lastActivity: { lt: new Date(Date.now() - 30 * 60 * 1000) } }
          ]
        },
        data: {
          isActive: false
        }
      })
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

  private async deactivateSession(token: string) {
    await prisma.userSession.update({
      where: { token },
      data: { isActive: false }
    })
  }
}