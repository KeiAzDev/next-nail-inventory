//src/api/stores/[id]/products/route.ts

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

    const resolvedParams = await context.params
    const storeId = resolvedParams.id
    
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const products = await prisma.product.findMany({
      where: { storeId },
      include: {
        currentProductLots: true  // ロット情報も取得
      },
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

    // トランザクションで商品とロットを作成
    const result = await prisma.$transaction(async (tx) => {
      // 商品の作成
      const product = await tx.product.create({
        data: {
          brand: body.brand,
          productName: body.productName,
          colorCode: body.colorCode,
          colorName: body.colorName,
          type: body.type,
          price: body.price,
          capacity: body.capacity,
          capacityUnit: body.capacityUnit,
          averageUsePerService: body.averageUsePerService,
          minStockAlert: body.minStockAlert,
          recommendedAlertPercentage: body.recommendedAlertPercentage,
          // ロット管理用フィールド
          totalQuantity: body.quantity,
          lotQuantity: body.quantity - 1,
          inUseQuantity: 1,
          // その他の初期値
          usageCount: 0,
          estimatedDaysLeft: null,
          averageUsesPerMonth: null,
          storeId: storeId,
        }
      })

      // 使用中ロットの作成
      const inUseLot = await tx.productLot.create({
        data: {
          productId: product.id,
          isInUse: true,
          currentAmount: body.capacity || null,
          startedAt: new Date()
        }
      })

      // 未使用ロットの作成（quantity - 1個）
      if (body.quantity > 1) {
        const unusedLots = Array(body.quantity - 1).fill(null).map(() => ({
          productId: product.id,
          isInUse: false
        }))

        await tx.productLot.createMany({
          data: unusedLots
        })
      }

      return {
        ...product,
        lots: [inUseLot]
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: '商品の追加に失敗しました' },
      { status: 500 }
    )
  }
}