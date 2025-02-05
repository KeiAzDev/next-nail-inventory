// src/app/api/stores/[id]/products/[productId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
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

    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        storeId
      },
      include: {
        currentProductLots: true
      }
    })

    if (!product) {
      return new NextResponse('Product not found', { status: 404 })
    }

    // データを整形して返却
    const formattedProduct = {
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
      currentProductLots: undefined
    }

    return NextResponse.json(formattedProduct)
  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json(
      { error: '商品情報の取得に失敗しました' },
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

    // 管理者とマネージャーのみ削除可能
    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // 商品の存在確認
    const existingProduct = await prisma.product.findUnique({
      where: {
        id: productId,
        storeId
      }
    })

    if (!existingProduct) {
      return new NextResponse('Product not found', { status: 404 })
    }

    // トランザクションで商品と関連データを削除
    await prisma.$transaction(async (tx) => {
      // まず関連する使用記録を削除
      await tx.relatedProductUsage.deleteMany({
        where: { productId }
      })
      
      await tx.usage.deleteMany({
        where: { productId }
      })

      // ServiceTypeProductの関連を削除
      await tx.serviceTypeProduct.deleteMany({
        where: { productId }
      })

      // 商品ロットを削除
      await tx.productLot.deleteMany({
        where: { productId }
      })

      // 最後に商品を削除
      await tx.product.delete({
        where: {
          id: productId,
          storeId
        }
      })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json(
      { error: '商品の削除に失敗しました' },
      { status: 500 }
    )
  }
}