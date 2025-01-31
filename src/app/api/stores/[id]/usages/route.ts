//src/app/api/stores/[id]/usages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { CreateUsageRequest } from '@/types/api'
import type { PrismaClient, Prisma, PrismaPromise } from '@prisma/client'

// トランザクション用の型定義
type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

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

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const usages = await prisma.usage.findMany({
      where: {
        product: {
          storeId
        },
        date: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        product: true,
        serviceType: true,
        relatedUsages: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json({ usages })
  } catch (error) {
    console.error('Usages fetch error:', error)
    return NextResponse.json(
      { error: '使用記録の取得に失敗しました' },
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
    
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body: CreateUsageRequest = await request.json()

    const usage = await prisma.$transaction(async (tx: TransactionClient) => {
      const mainProduct = await tx.product.findUnique({
        where: { 
          id: body.mainProduct.productId,
          storeId 
        }
      })

      if (!mainProduct) {
        throw new Error('主要商品が見つかりません')
      }

      if (mainProduct.quantity < 1) {
        throw new Error('在庫が不足しています')
      }

      for (const relatedProduct of body.relatedProducts) {
        const product = await tx.product.findUnique({
          where: { 
            id: relatedProduct.productId,
            storeId 
          }
        })

        if (!product) {
          throw new Error('関連商品が見つかりません')
        }

        if (product.quantity < 1) {
          throw new Error('関連商品の在庫が不足しています')
        }
      }

      const newUsage = await tx.usage.create({
        data: {
          date: new Date(body.date),
          usageAmount: body.mainProduct.amount,
          nailLength: body.nailLength,
          isCustomAmount: false,
          note: body.note,
          serviceType: {
            connect: { id: body.serviceTypeId }
          },
          product: {
            connect: { id: body.mainProduct.productId }
          },
          relatedUsages: {
            create: body.relatedProducts.map((rp) => ({
              amount: rp.amount,
              product: {
                connect: { id: rp.productId }
              }
            }))
          }
        },
        include: {
          product: true,
          serviceType: true,
          relatedUsages: {
            include: {
              product: true
            }
          }
        }
      })

      await tx.product.update({
        where: { id: body.mainProduct.productId },
        data: {
          quantity: {
            decrement: 1
          },
          usageCount: {
            increment: 1
          },
          lastUsed: new Date(),
          averageUsesPerMonth: {
            set: await calculateAverageUses(tx, body.mainProduct.productId)
          }
        }
      })

      for (const relatedProduct of body.relatedProducts) {
        await tx.product.update({
          where: { id: relatedProduct.productId },
          data: {
            quantity: {
              decrement: 1
            },
            usageCount: {
              increment: 1
            },
            lastUsed: new Date(),
            averageUsesPerMonth: {
              set: await calculateAverageUses(tx, relatedProduct.productId)
            }
          }
        })
      }

      return newUsage
    })

    return NextResponse.json({ usage })
  } catch (error) {
    console.error('Usage record creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '使用記録の登録に失敗しました' },
      { status: 500 }
    )
  }
}

async function calculateAverageUses(
  tx: TransactionClient,
  productId: string
): Promise<number> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const usages = await tx.usage.findMany({
    where: {
      productId,
      date: {
        gte: thirtyDaysAgo
      }
    }
  })

  const relatedUsages = await tx.relatedProductUsage.findMany({
    where: {
      productId,
      usage: {
        date: {
          gte: thirtyDaysAgo
        }
      }
    }
  })

  const totalUsages = usages.length + relatedUsages.length
  return Number((totalUsages / 30).toFixed(2))
}