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
      const serviceType = await tx.serviceType.create({
        data: {
          name: defaultType.name,
          defaultUsageAmount: defaultType.defaultUsageAmount,
          productType: defaultType.productType,
          shortLengthRate: defaultType.shortLengthRate,
          mediumLengthRate: defaultType.mediumLengthRate,
          longLengthRate: defaultType.longLengthRate,
          allowCustomAmount: defaultType.allowCustomAmount,
          store: {
            connect: { id: storeId }
          }
        }
      })

      // 関連商品の設定がある場合の処理
      if (defaultType.requiredProducts) {
        for (const requiredProduct of defaultType.requiredProducts) {
          await tx.serviceTypeProduct.create({
            data: {
              serviceType: { connect: { id: serviceType.id } },
              product: {
                connectOrCreate: {
                  where: {
                    id: '0' // ダミーID、実際には適切な検索条件を設定
                  },
                  create: {
                    brand: 'Default Brand',
                    productName: `Default ${requiredProduct.type}`,
                    colorCode: '#000000',
                    colorName: 'Default',
                    type: requiredProduct.type,
                    price: 0,
                    store: { connect: { id: storeId } }
                  }
                }
              },
              usageAmount: requiredProduct.defaultAmount,
              isRequired: requiredProduct.isRequired
            }
          })
        }
      }

      serviceTypes.push(serviceType)
    }

    return serviceTypes.map(serviceType => ({
      name: serviceType.name,
      defaultUsageAmount: serviceType.defaultUsageAmount,
      productType: serviceType.productType,
      shortLengthRate: serviceType.shortLengthRate,
      mediumLengthRate: serviceType.mediumLengthRate,
      longLengthRate: serviceType.longLengthRate,
      allowCustomAmount: serviceType.allowCustomAmount,
      store: { connect: { id: storeId } }
    }))

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