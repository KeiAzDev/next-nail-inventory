//src/lib/service-types/create-defaults.ts
import { PrismaClient, Prisma } from '@prisma/client'
import { DEFAULT_SERVICE_TYPES } from './defaults'

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export class ServiceTypeError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ServiceTypeError'
  }
}

export async function createDefaultServiceTypes(
  tx: TransactionClient,
  storeId: string
) {
  try {
    const serviceTypes = []

    for (const defaultType of DEFAULT_SERVICE_TYPES) {
      console.log('Creating service type:', {
        name: defaultType.name,
        isGelService: defaultType.isGelService,
        requiresBase: defaultType.requiresBase,
        requiresTop: defaultType.requiresTop,
        productType: defaultType.productType
      });

      // 施術タイプの作成
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

      // 関連商品の設定が存在する場合
      if (defaultType.requiredProducts) {
        for (const requiredProduct of defaultType.requiredProducts) {
          await tx.serviceTypeProduct.create({
            data: {
              serviceType: { connect: { id: serviceType.id } },
              product: { connect: { id: '' } }, // この部分は後で商品が作成されてから設定
              usageAmount: requiredProduct.defaultAmount,
              isRequired: requiredProduct.isRequired,
              productRole: requiredProduct.productRole,
              order: requiredProduct.order
            }
          })
        }
      }

      serviceTypes.push(serviceType)
    }

    return serviceTypes
  } catch (error) {
    console.error('Service type creation error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new ServiceTypeError(
        'デフォルト施術タイプの作成に失敗しました',
        {
          code: error.code,
          meta: error.meta,
          message: error.message
        }
      )
    }
    throw new ServiceTypeError(
      'デフォルト施術タイプの作成中に予期せぬエラーが発生しました',
      { error }
    )
  }
}