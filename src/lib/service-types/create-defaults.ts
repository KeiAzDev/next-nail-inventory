import { PrismaClient, Prisma } from '@prisma/client'
import { DEFAULT_SERVICE_TYPES } from './defaults'

// トランザクションクライアントの型を修正
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
      // 基本の施術タイプのみを作成
      const serviceType = await tx.serviceType.create({
        data: {
          name: defaultType.name,
          defaultUsageAmount: defaultType.defaultUsageAmount,
          productType: defaultType.productType,
          shortLengthRate: defaultType.shortLengthRate,
          mediumLengthRate: defaultType.mediumLengthRate,
          longLengthRate: defaultType.longLengthRate,
          allowCustomAmount: defaultType.allowCustomAmount,
          store: { connect: { id: storeId } }
        }
      })

      // requiredProductsの自動作成を削除
      serviceTypes.push(serviceType)
    }

    return serviceTypes
  } catch (error) {
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