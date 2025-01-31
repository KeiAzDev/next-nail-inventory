import { Type } from '@prisma/client'

/**
 * 関連商品の設定を定義するインターフェース
 */
interface RequiredProduct {
  type: Type
  defaultAmount: number
  isRequired: boolean
}

/**
 * デフォルト施術タイプの設定を定義するインターフェース
 */
interface DefaultServiceType {
  name: string
  defaultUsageAmount: number
  productType: Type
  shortLengthRate: number
  mediumLengthRate: number
  longLengthRate: number
  allowCustomAmount: boolean
  requiredProducts?: RequiredProduct[]
}

/**
 * デフォルト施術タイプの定義
 * 新規店舗作成時や既存店舗の移行時に使用
 */
export const DEFAULT_SERVICE_TYPES: DefaultServiceType[] = [
  {
    name: "ポリッシュ",
    defaultUsageAmount: 0.5,
    productType: "POLISH",
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: true
  },
  {
    name: "ジェル",
    defaultUsageAmount: 1.0,
    productType: "GEL_COLOR",
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: true,
    requiredProducts: [
      {
        type: "GEL_BASE",
        defaultAmount: 1.5,
        isRequired: true
      },
      {
        type: "GEL_TOP",
        defaultAmount: 1.5,
        isRequired: true
      }
    ]
  }
] as const

/**
 * デフォルト施術タイプのユーティリティ関数
 */
export class DefaultServiceTypeUtils {
  /**
   * デフォルト施術タイプの存在確認
   */
  static isDefaultServiceType(name: string): boolean {
    return DEFAULT_SERVICE_TYPES.some(type => type.name === name)
  }

  /**
   * 商品タイプに対応するデフォルト施術タイプの取得
   */
  static findByProductType(type: Type): DefaultServiceType | undefined {
    return DEFAULT_SERVICE_TYPES.find(st => st.productType === type)
  }

  /**
   * デフォルト施術タイプの必要商品タイプリストの取得
   */
  static getRequiredProductTypes(name: string): Type[] {
    const serviceType = DEFAULT_SERVICE_TYPES.find(st => st.name === name)
    if (!serviceType || !serviceType.requiredProducts) return []
    
    return serviceType.requiredProducts
      .filter(rp => rp.isRequired)
      .map(rp => rp.type)
  }
}

/**
 * デフォルト施術タイプの設定定数
 */
export const DEFAULT_SERVICE_TYPE_CONFIG = {
  // 長さ調整のデフォルト値
  LENGTH_RATES: {
    SHORT: 80,
    MEDIUM: 100,
    LONG: 130
  },
  
  // 施術タイプごとのデフォルト使用量（ml/g）
  DEFAULT_AMOUNTS: {
    POLISH: 0.5,
    GEL_COLOR: 1.0,
    GEL_BASE: 1.5,
    GEL_TOP: 1.5
  }
} as const

/**
 * デフォルト施術タイプの初期データを生成する関数
 */
export function generateDefaultServiceTypeData(storeId: string) {
  return DEFAULT_SERVICE_TYPES.map(serviceType => ({
    name: serviceType.name,
    defaultUsageAmount: serviceType.defaultUsageAmount,
    productType: serviceType.productType,
    shortLengthRate: serviceType.shortLengthRate,
    mediumLengthRate: serviceType.mediumLengthRate,
    longLengthRate: serviceType.longLengthRate,
    allowCustomAmount: serviceType.allowCustomAmount,
    storeId
  }))
}