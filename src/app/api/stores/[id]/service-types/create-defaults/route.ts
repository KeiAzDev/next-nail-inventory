//src/app/api/stores/[id]/service-types/create-defaults/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { DEFAULT_SERVICE_TYPES } from '@/lib/service-types/defaults'
import { Type } from '@prisma/client'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('認証されていません', { status: 401 })
    }

    const resolvedParams = await context.params
    const storeId = resolvedParams.id
    
    // ADMIN または 対象店舗のオーナーのみがこの操作を許可される
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return new NextResponse('権限がありません', { status: 403 })
    }

    // 現在のサービスタイプを確認
    const existingServiceTypes = await prisma.serviceType.findMany({
      where: { storeId }
    })

    console.log(`Store ${storeId} has ${existingServiceTypes.length} existing service types`);

    // デフォルトサービスタイプが既に存在するか確認
    const missingServiceTypes = DEFAULT_SERVICE_TYPES.filter(
      defaultType => !existingServiceTypes.some(
        existingType => existingType.name === defaultType.name
      )
    )

    if (missingServiceTypes.length === 0) {
      return NextResponse.json({ 
        message: 'すべてのデフォルトサービスタイプは既に存在しています',
        count: existingServiceTypes.length 
      })
    }

    // トランザクションでデフォルトサービスタイプを作成
    const result = await prisma.$transaction(async (tx) => {
      // 不足しているサービスタイプのみ作成
      const createdServiceTypes = []
      
      for (const defaultType of missingServiceTypes) {
        try {
          const serviceType = await tx.serviceType.create({
            data: {
              name: defaultType.name,
              defaultUsageAmount: defaultType.defaultUsageAmount,
              productType: defaultType.productType,
              // ジェル関連のフラグを設定
              isGelService: defaultType.isGelService,
              requiresBase: defaultType.requiresBase,
              requiresTop: defaultType.requiresTop,
              // 長さごとの設定
              shortLengthRate: defaultType.shortLengthRate,
              mediumLengthRate: defaultType.mediumLengthRate,
              longLengthRate: defaultType.longLengthRate,
              allowCustomAmount: defaultType.allowCustomAmount,
              // 店舗との関連付け
              store: { connect: { id: storeId } }
            }
          })
          
          console.log(`Created service type: ${serviceType.name}, ID: ${serviceType.id}`);
          createdServiceTypes.push(serviceType)
        } catch (error) {
          console.error(`Error creating service type ${defaultType.name}:`, error)
          // エラーを記録するが、他のサービスタイプの作成は続行
        }
      }
      
      return createdServiceTypes
    })

    return NextResponse.json({
      message: `${result.length}個のデフォルトサービスタイプを作成しました`,
      created: result,
      total: existingServiceTypes.length + result.length
    })
  } catch (error) {
    console.error('Error creating default service types:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'デフォルトサービスタイプの作成に失敗しました' },
      { status: 500 }
    )
  }
}