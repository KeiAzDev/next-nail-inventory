// /src/app/api/stores/[id]/staff/[staffId]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await context.params
    const { id: storeId, staffId } = resolvedParams

    if (session.user.id !== staffId && session.user.role !== 'ADMIN') {
      return Response.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const profile = await prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        image: true,
        phone: true,
        shifts: true,
        area: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!profile) {
      return Response.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }

    return Response.json(profile)

  } catch (error) {
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Profile fetch error:', errorMessage)
    
    return Response.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    )
  }
}