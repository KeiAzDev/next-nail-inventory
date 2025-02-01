//src/app/api/stores/[id]/service-types/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { ServiceType } from '@/types/api'



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

    const serviceTypes = await prisma.serviceType.findMany({
      where: { 
        storeId,
      },
      include: {
        serviceTypeProducts: {
          where: {
            product: {
              storeId,
              // 削除された商品を除外
              NOT: {
                id: undefined
              }
            }
          },
          include: {
            product: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    const formattedServiceTypes: ServiceType[] = serviceTypes.map(st => ({
      id: st.id,
      name: st.name,
      defaultUsageAmount: st.defaultUsageAmount,
      productType: st.productType,
      shortLengthRate: st.shortLengthRate,
      mediumLengthRate: st.mediumLengthRate,
      longLengthRate: st.longLengthRate,
      allowCustomAmount: st.allowCustomAmount,
      storeId: st.storeId,
      createdAt: st.createdAt.toISOString(),
      updatedAt: st.updatedAt.toISOString(),
      serviceTypeProducts: st.serviceTypeProducts
        .filter(stp => stp.product !== null)
        .map(stp => ({
          id: stp.id,
          serviceTypeId: stp.serviceTypeId,
          productId: stp.productId,
          usageAmount: stp.usageAmount,
          isRequired: stp.isRequired,
          createdAt: stp.createdAt.toISOString(),
          updatedAt: stp.updatedAt.toISOString(),
          product: stp.product ? {
            ...stp.product,
            totalQuantity: stp.product.totalQuantity || 0,
            inUseQuantity: stp.product.inUseQuantity || 0,
            lotQuantity: stp.product.lotQuantity || 0,
            createdAt: stp.product.createdAt.toISOString(),
            updatedAt: stp.product.updatedAt.toISOString(),
            lastUsed: stp.product.lastUsed?.toISOString() || null,
            capacity: stp.product.capacity,
            capacityUnit: stp.product.capacityUnit,
            averageUsePerService: stp.product.averageUsePerService,
            averageUsesPerMonth: stp.product.averageUsesPerMonth,
            estimatedDaysLeft: stp.product.estimatedDaysLeft
          } : undefined
        }))
    }))

    return NextResponse.json({ serviceTypes: formattedServiceTypes })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '予期せぬエラーが発生しました'
    console.error('ServiceTypes fetch error:', errorMessage)
    
    return NextResponse.json(
      { error: '施術タイプの取得に失敗しました' },
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

    // トランザクションで施術タイプと関連商品を一括登録
    const serviceType = await prisma.$transaction(async (tx) => {
      // 施術タイプの作成
      const newServiceType = await tx.serviceType.create({
        data: {
          name: body.name,
          defaultUsageAmount: body.defaultUsageAmount,
          productType: body.productType,
          shortLengthRate: body.shortLengthRate ?? 80,
          mediumLengthRate: body.mediumLengthRate ?? 100,
          longLengthRate: body.longLengthRate ?? 130,
          allowCustomAmount: body.allowCustomAmount ?? false,
          store: {
            connect: { id: storeId }
          },
          // 関連商品の登録
          serviceTypeProducts: {
            create: body.products.map((product: any) => ({
              product: {
                connect: { id: product.productId }
              },
              usageAmount: product.usageAmount,
              isRequired: product.isRequired ?? true
            }))
          }
        },
        include: {
          serviceTypeProducts: {
            include: {
              product: true
            }
          }
        }
      })

      return newServiceType
    })

    return NextResponse.json(serviceType)
  } catch (error) {
    console.error('ServiceType creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '施術タイプの登録に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { id, products, ...updateData } = body

    // トランザクションで施術タイプと関連商品を一括更新
    const serviceType = await prisma.$transaction(async (tx) => {
      // 既存の関連商品を削除
      await tx.serviceTypeProduct.deleteMany({
        where: { serviceTypeId: id }
      })

      // 施術タイプの更新と関連商品の再登録
      const updatedServiceType = await tx.serviceType.update({
        where: { id },
        data: {
          ...updateData,
          serviceTypeProducts: {
            create: products.map((product: any) => ({
              product: {
                connect: { id: product.productId }
              },
              usageAmount: product.usageAmount,
              isRequired: product.isRequired ?? true
            }))
          }
        },
        include: {
          serviceTypeProducts: {
            include: {
              product: true
            }
          }
        }
      })

      return updatedServiceType
    })

    return NextResponse.json(serviceType)
  } catch (error) {
    console.error('ServiceType update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '施術タイプの更新に失敗しました' },
      { status: 500 }
    )
  }
}