// /src/app/api/stores/[id]/sessions/statistics/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { validateStoreAccess } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const hasAccess = await validateStoreAccess(params.id)
    if (!hasAccess) {
      return new Response('Forbidden', { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) })
    }

    // アクティブなセッションを取得
    const activeSessions = await prisma.userSession.findMany({
      where: {
        storeId: params.id,
        isActive: true
      },
      select: {
        device: true,
        browser: true
      }
    })

    // 統計の手動集計
    const deviceCounts: Record<string, number> = {}
    const browserCounts: Record<string, number> = {}

    activeSessions.forEach(session => {
      // デバイスの集計
      const device = session.device || 'unknown'
      deviceCounts[device] = (deviceCounts[device] || 0) + 1

      // ブラウザの集計
      const browser = session.browser || 'unknown'
      browserCounts[browser] = (browserCounts[browser] || 0) + 1
    })

    // 集計データの変換
    const deviceStats = Object.entries(deviceCounts).map(([device, count]) => ({
      deviceType: device,
      count,
      percentage: Number(((count / activeSessions.length) * 100).toFixed(1))
    }))

    const browserStats = Object.entries(browserCounts).map(([browser, count]) => ({
      browser,
      count,
      percentage: Number(((count / activeSessions.length) * 100).toFixed(1))
    }))

    // アクティビティの取得
    const recentActivities = await prisma.activity.findMany({
      where: {
        user: {
          storeId: params.id
        },
        type: {
          in: [
            'SESSION_CREATE',
            'SESSION_EXPIRE',
            'SESSION_INVALIDATE',
            'CONCURRENT_LIMIT',
            'SUSPICIOUS_ACCESS'
          ]
        },
        createdAt: dateFilter
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // 総セッション数の取得
    const totalSessions = await prisma.userSession.count({
      where: {
        storeId: params.id,
        createdAt: dateFilter
      }
    })

    return Response.json({
      totalSessions,
      activeSessions: activeSessions.length,
      deviceStats,
      browserStats,
      recentActivities: recentActivities.map(activity => ({
        timestamp: activity.createdAt.toISOString(),
        type: activity.type,
        count: 1
      })),
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Session statistics error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}