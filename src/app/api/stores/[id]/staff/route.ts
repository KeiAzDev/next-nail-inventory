//src/api/stores/[id]/staff/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // paramsそのものを非同期で解決
    const resolvedParams = await context.params
    const storeId = resolvedParams.id
    
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const staff = await prisma.user.findMany({
      where: { storeId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff fetch error:', error)
    return NextResponse.json(
      { error: 'スタッフ情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // paramsそのものを非同期で解決
    const resolvedParams = await context.params
    const storeId = resolvedParams.id

    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const staff = await prisma.user.create({
      data: {
        ...body,
        storeId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff creation error:', error)
    return NextResponse.json(
      { error: 'スタッフの追加に失敗しました' },
      { status: 500 }
    )
  }
}