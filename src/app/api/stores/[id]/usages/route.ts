import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { CreateUsageRequest } from '@/types/api'
import type { PrismaClient, Prisma } from '@prisma/client'

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

interface UpdateMonthlyStatsParams {
  serviceTypeId: string;
  date: Date;
  amount: number;
  designVariant?: string;
  temperature?: number;
  humidity?: number;
}

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
      // メイン商品の取得と在庫チェック
      const mainProduct = await tx.product.findUnique({
        where: { 
          id: body.mainProduct.productId,
          storeId 
        },
        include: {
          currentProductLots: true
        }
      })
    
      if (!mainProduct) {
        throw new Error('主要商品が見つかりません')
      }
    
      if (mainProduct.lotQuantity < 1 && !mainProduct.currentProductLots.some(lot => lot.isInUse && (lot.currentAmount ?? 0) > 0)) {
        throw new Error('在庫が不足しています')
      }

      // 関連商品のチェック
      for (const relatedProduct of body.relatedProducts) {
        const product = await tx.product.findUnique({
          where: { 
            id: relatedProduct.productId,
            storeId 
          },
          include: {
            currentProductLots: true
          }
        })
    
        if (!product) {
          throw new Error('関連商品が見つかりません')
        }
    
        if (product.lotQuantity < 1 && !product.currentProductLots.some(lot => lot.isInUse && (lot.currentAmount ?? 0) > 0)) {
          throw new Error('関連商品の在庫が不足しています')
        }
      }
    
      // メイン商品の使用記録作成
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

      // メイン商品のロット・在庫更新
      await updateProductStock(tx, mainProduct, body.mainProduct.amount)
      
      // 関連商品の在庫更新
      for (const relatedUsage of body.relatedProducts) {
        const relatedProduct = await tx.product.findUnique({
          where: { id: relatedUsage.productId },
          include: {
            currentProductLots: true
          }
        })

        if (relatedProduct) {
          await updateProductStock(tx, relatedProduct, relatedUsage.amount)
        }
      }

      // 月間統計の更新
      await updateMonthlyStats(tx, {
        serviceTypeId: body.serviceTypeId,
        date: new Date(body.date),
        amount: body.mainProduct.amount,
        designVariant: body.designVariant,
        temperature: body.temperature,
        humidity: body.humidity
      })

      // 統計情報の更新
      const averageUses = await calculateAverageUses(tx, mainProduct.id)
      await tx.product.update({
        where: { id: mainProduct.id },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date(),
          averageUsesPerMonth: averageUses
        }
      })
    
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

async function updateProductStock(
  tx: TransactionClient,
  product: any,
  usageAmount: number
) {
  const inUseLot = product.currentProductLots.find((lot: any) => lot.isInUse)
  if (inUseLot) {
    const newAmount = (inUseLot.currentAmount ?? 0) - usageAmount
    if (newAmount <= 0 && product.lotQuantity > 0) {
      // 現在のロットを使い切り状態に更新
      await tx.productLot.update({
        where: { id: inUseLot.id },
        data: {
          currentAmount: 0,
          isInUse: false
        }
      })

      // 新しいロットを使用開始
      const newLot = await tx.productLot.findFirst({
        where: {
          productId: product.id,
          isInUse: false
        }
      })

      if (newLot) {
        await tx.productLot.update({
          where: { id: newLot.id },
          data: {
            isInUse: true,
            currentAmount: product.capacity,
            startedAt: new Date()
          }
        })
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          lotQuantity: {
            decrement: 1
          }
        }
      })
    } else {
      // 現在のロットの残量を更新
      await tx.productLot.update({
        where: { id: inUseLot.id },
        data: {
          currentAmount: newAmount
        }
      })
    }
  }
}

async function updateMonthlyStats(
  tx: TransactionClient,
  data: UpdateMonthlyStatsParams
) {
  const month = data.date.getMonth() + 1;
  const year = data.date.getFullYear();

  const stat = await tx.monthlyServiceStat.findFirst({
    where: {
      serviceTypeId: data.serviceTypeId,
      month,
      year
    }
  });

  const designUsageStats = stat?.designUsageStats as Record<string, number> ?? {};
  if (data.designVariant) {
    designUsageStats[data.designVariant] = (designUsageStats[data.designVariant] ?? 0) + data.amount;
  }

  return await tx.monthlyServiceStat.upsert({
    where:  {
      id: stat?.id ?? '',  // 既存のstatがあればそのID、なければ空文字
    },
    create: {
      serviceTypeId: data.serviceTypeId,
      month,
      year,
      totalUsage: data.amount,
      usageCount: 1,
      averageUsage: data.amount,
      temperature: data.temperature,
      humidity: data.humidity,
      seasonalRate: calculateSeasonalRate({ temperature: data.temperature, humidity: data.humidity }),
      designUsageStats,
      predictedUsage: 0,
      actualDeviation: 0,
      averageTimePerUse: 0
    },
    update: {
      totalUsage: { increment: data.amount },
      usageCount: { increment: 1 },
      averageUsage: {
        set: stat ? ((stat.totalUsage + data.amount) / (stat.usageCount + 1)) : data.amount
      },
      temperature: data.temperature,
      humidity: data.humidity,
      designUsageStats: { set: designUsageStats }
    }
  });
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

function calculateSeasonalRate(data: { 
  temperature?: number; 
  humidity?: number;
}): number {
  if (!data.temperature || !data.humidity) return 1.0
  
  const tempFactor = 1 + (data.temperature - 22) * 0.01  // 22度を基準
  const humidFactor = 1 + (data.humidity - 50) * 0.005   // 50%を基準
  
  return Number((tempFactor * humidFactor).toFixed(3))
}