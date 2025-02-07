import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // storeIdをURLから取得
    const storeId = request.nextUrl.pathname.split('/')[3]
    
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // アクセス権限の確認
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 店舗の存在確認
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 以下、元の実装と同じ
    const serviceTypes = await prisma.serviceType.findMany({
      where: {
        storeId
      },
      include: {
        monthlyStats: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ],
          take: 12
        }
      }
    })

    const usageStats = await prisma.usage.groupBy({
      by: ['serviceTypeId'],
      where: {
        product: {
          storeId
        }
      },
      _count: {
        id: true
      },
      _sum: {
        usageAmount: true
      }
    })

    const statistics = serviceTypes.map(serviceType => {
      const usageStat = usageStats.find(stat => stat.serviceTypeId === serviceType.id)
      
      const monthlyStats = serviceType.monthlyStats.map(stat => ({
        ...stat,
        createdAt: stat.createdAt.toISOString(),
        updatedAt: stat.updatedAt.toISOString()
      }))

      return {
        serviceTypeId: serviceType.id,
        serviceName: serviceType.name,
        totalUsageCount: usageStat?._count.id ?? 0,
        totalUsageAmount: usageStat?._sum.usageAmount ?? 0,
        monthlyStats
      }
    })

    return NextResponse.json({ statistics })

  } catch (error) {
    console.error('Statistics API Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}