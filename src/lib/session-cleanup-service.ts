// src/lib/session-cleanup-service.ts
import { prisma } from './prisma'
import type { PrismaClient } from '@prisma/client'

export class SessionCleanupService {
  private static instance: SessionCleanupService
  private cleanupInterval: NodeJS.Timeout | null = null  // Timerから修正
  private readonly CLEANUP_INTERVAL = 15 * 60 * 1000

  private constructor() {}

  static getInstance(): SessionCleanupService {
    if (!SessionCleanupService.instance) {
      SessionCleanupService.instance = new SessionCleanupService()
    }
    return SessionCleanupService.instance
  }

  startCleanupSchedule() {
    if (this.cleanupInterval) {
      return
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup()
      } catch (error) {
        console.error('Session cleanup error:', error)
      }
    }, this.CLEANUP_INTERVAL)
  }

  stopCleanupSchedule() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  private async performCleanup() {
    const now = new Date()
    
    await prisma.userSession.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          {
            AND: [
              { isActive: true },
              { lastActivity: { lt: new Date(now.getTime() - 30 * 60 * 1000) } }
            ]
          }
        ]
      },
      data: { isActive: false }
    })
  }
}