import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Product } from '@prisma/client'

// 古いProductタイプの定義
interface LegacyProduct extends Omit<Product, 'totalQuantity' | 'lotQuantity' | 'inUseQuantity'> {
  quantity: number;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await context.params
    const storeId = resolvedParams.id

    // トランザクションでマイグレーションを実行
    const result = await prisma.$transaction(async (tx) => {
      // 既存の商品を取得
      const existingProducts = await tx.product.findMany({
        where: { storeId },
        select: {
          id: true,
          capacity: true,
          capacityUnit: true,
          totalQuantity: true
        }
      })

      // 各商品に対してロットを作成
      const migrations = await Promise.all(
        existingProducts.map(async (product) => {
          // デフォルトの数量を設定
          const quantity = product.totalQuantity ?? 1

          // 基本情報の更新
          const updatedProduct = await tx.product.update({
            where: { id: product.id },
            data: {
              totalQuantity: quantity,
              lotQuantity: Math.max(0, quantity - 1), // 負の値を防ぐ
              inUseQuantity: 1,
              capacity: product.capacity ?? 0,
              capacityUnit: product.capacityUnit ?? 'ml'
            }
          })

          // 使用中のロットを作成
          const lot = await tx.productLot.create({
            data: {
              productId: product.id,
              isInUse: true,
              currentAmount: product.capacity ?? 0,
              startedAt: new Date()
            }
          })

          // 未使用のロットを作成（quantity - 1個）
          const unusedLotsCount = Math.max(0, quantity - 1) // 負の値を防ぐ
          const unusedLots = Array(unusedLotsCount).fill(null).map(() => ({
            productId: product.id,
            isInUse: false
          }))

          if (unusedLots.length > 0) {
            await tx.productLot.createMany({
              data: unusedLots
            })
          }

          return {
            productId: product.id,
            updatedProduct,
            lots: [lot, ...unusedLots]
          }
        })
      )

      return migrations
    })

    return NextResponse.json({
      message: 'マイグレーションが完了しました',
      result
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'マイグレーションに失敗しました' },
      { status: 500 }
    )
  }
}