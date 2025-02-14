//src/app/api/stores/[id]/products/route.ts
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
        currentProductLots: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // レスポンスデータの整形
    const formattedProducts = products.map(product => ({
      ...product,
      lots: product.currentProductLots.map(lot => ({
        ...lot,
        startedAt: lot.startedAt?.toISOString() || null,
        createdAt: lot.createdAt.toISOString(),
        updatedAt: lot.updatedAt.toISOString()
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      lastUsed: product.lastUsed?.toISOString() || null,
      currentProductLots: undefined  // この属性は削除
    }))

    return NextResponse.json(formattedProducts)
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

      // アクティビティログの記録
      await tx.activity.create({
        data: {
          userId: session.user.id,
          type: 'PRODUCT_CREATE',
          action: '商品登録',
          metadata: {
            productName: body.productName,
            brand: body.brand,
            type: body.type,
            colorName: body.colorName,
            capacity: body.capacity,
            capacityUnit: body.capacityUnit,
            quantity: body.quantity
          }
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

      // 作成した商品データを整形して返却
      const formattedProduct = {
        ...product,
        lots: [{
          ...inUseLot,
          startedAt: inUseLot.startedAt?.toISOString() || null,
          createdAt: inUseLot.createdAt.toISOString(),
          updatedAt: inUseLot.updatedAt.toISOString()
        }],
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        lastUsed: product.lastUsed?.toISOString() || null,
        currentProductLots: undefined
      }

      return formattedProduct
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; productId: string }> | { id: string; productId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await context.params
    const { id: storeId, productId } = resolvedParams
    
    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()

    const result = await prisma.$transaction(async (tx) => {
      // 更新前の商品情報を取得
      const oldProduct = await tx.product.findUnique({
        where: { id: productId }
      })

      if (!oldProduct) {
        throw new Error('商品が見つかりません')
      }

      // 商品の更新
      const product = await tx.product.update({
        where: { id: productId },
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
        }
      })

      // アクティビティログの記録
      await tx.activity.create({
        data: {
          userId: session.user.id,
          type: 'PRODUCT_UPDATE',
          action: '商品更新',
          metadata: {
            productName: product.productName,
            brand: product.brand,
            updates: {
              // 更新された項目のみを記録
              ...(oldProduct.brand !== product.brand && { brand: { old: oldProduct.brand, new: product.brand } }),
              ...(oldProduct.productName !== product.productName && { productName: { old: oldProduct.productName, new: product.productName } }),
              ...(oldProduct.colorName !== product.colorName && { colorName: { old: oldProduct.colorName, new: product.colorName } }),
              ...(oldProduct.price !== product.price && { price: { old: oldProduct.price, new: product.price } }),
              ...(oldProduct.capacity !== product.capacity && { capacity: { old: oldProduct.capacity, new: product.capacity } }),
              ...(oldProduct.capacityUnit !== product.capacityUnit && { capacityUnit: { old: oldProduct.capacityUnit, new: product.capacityUnit } })
            }
          }
        }
      })

      // 更新後の商品データを整形して返却
      return {
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        lastUsed: product.lastUsed?.toISOString() || null
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '商品の更新に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; productId: string }> | { id: string; productId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await context.params
    const { id: storeId, productId } = resolvedParams
    
    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 削除する商品の情報を取得
      const product = await tx.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        throw new Error('商品が見つかりません')
      }

      // まず関連する使用記録とロットを削除
      await tx.relatedProductUsage.deleteMany({
        where: { productId }
      })

      await tx.usage.deleteMany({
        where: { productId }
      })

      await tx.productLot.deleteMany({
        where: { productId }
      })

      // 商品の削除
      await tx.product.delete({
        where: { id: productId }
      })

      // アクティビティログの記録
      await tx.activity.create({
        data: {
          userId: session.user.id,
          type: 'PRODUCT_DELETE',
          action: '商品削除',
          metadata: {
            productName: product.productName,
            brand: product.brand,
            type: product.type,
            colorName: product.colorName,
            deletedAt: new Date().toISOString()
          }
        }
      })

      return {
        success: true,
        message: '商品を削除しました',
        deletedProduct: {
          ...product,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
          lastUsed: product.lastUsed?.toISOString() || null
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '商品の削除に失敗しました' },
      { status: 500 }
    )
  }
}