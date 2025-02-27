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
    console.log(`Creating default service types for store: ${storeId}`);

    // 関連商品のために必要なデフォルト商品タイプの一覧を取得
    const requiredProductTypes = new Set<string>();
    DEFAULT_SERVICE_TYPES.forEach(serviceType => {
      if (serviceType.requiredProducts) {
        serviceType.requiredProducts.forEach(product => {
          requiredProductTypes.add(String(product.type));
        });
      }
    });

    console.log('Required product types:', Array.from(requiredProductTypes));

    // サービスタイプの作成（関連商品なし）
    for (const defaultType of DEFAULT_SERVICE_TYPES) {
      console.log('Creating service type:', {
        name: defaultType.name,
        isGelService: defaultType.isGelService,
        requiresBase: defaultType.requiresBase,
        requiresTop: defaultType.requiresTop,
        productType: defaultType.productType
      });

      try {
        // 施術タイプの作成（関連商品なし）
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
        });
        
        console.log(`Created service type: ${serviceType.name}, ID: ${serviceType.id}`);
        serviceTypes.push(serviceType);
      } catch (error) {
        // 個別のサービスタイプ作成エラーをログに残すが、全体の処理は継続
        console.error(`Error creating service type: ${defaultType.name}`, error);
      }
    }

    console.log(`Successfully created ${serviceTypes.length} default service types`);
    return serviceTypes;
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