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

    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: '商品情報の取得に失敗しました' },
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
    const product = await prisma.product.create({
      data: {
        ...body,
        storeId,
        usageCount: 0,
        estimatedDaysLeft: null,
        averageUsesPerMonth: null
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: '商品の追加に失敗しました' },
      { status: 500 }
    )
  }
}