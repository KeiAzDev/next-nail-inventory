//src/app/api/stores/[id]/staff/[staffId]/activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)
    if (!session) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // パラメータの解決
    const resolvedParams = await context.params
    const { id: storeId, staffId } = resolvedParams

    // URL パラメータの取得
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 権限チェック：自身のログか、ADMINユーザーのみアクセス可能
    if (session.user.id !== staffId && session.user.role !== 'ADMIN') {
      return Response.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // アクティビティの取得
    const activities = await prisma.activity.findMany({
      where: { userId: staffId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        action: true,
        metadata: true,
        createdAt: true,
      }
    })

    // 総件数の取得
    const total = await prisma.activity.count({
      where: { userId: staffId }
    })

    return Response.json({
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Activity fetch error:', errorMessage)
    
    return Response.json(
      { error: 'アクティビティログの取得に失敗しました' },
      { status: 500 }
    )
  }
}