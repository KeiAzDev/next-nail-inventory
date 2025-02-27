//src/lib/service-types/defaults.ts
import { Type } from '@prisma/client'

interface RequiredProduct {
  type: Type
  defaultAmount: number
  isRequired: boolean
  productRole?: string
  order: number
}

interface DefaultServiceType {
  name: string
  defaultUsageAmount: number
  productType: Type
  shortLengthRate: number
  mediumLengthRate: number
  longLengthRate: number
  allowCustomAmount: boolean
  isGelService: boolean
  requiresBase: boolean
  requiresTop: boolean
  requiredProducts?: RequiredProduct[]
}

export const DEFAULT_SERVICE_TYPES: DefaultServiceType[] = [
  // ポリッシュカラーサービス（POLISH→POLISH_COLORに更新）
  {
    name: "ワンカラー（ポリッシュ）",
    defaultUsageAmount: 0.5,
    productType: "POLISH_COLOR" as Type,
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: true,
    isGelService: false,
    requiresBase: false,
    requiresTop: false
  },
  // ポリッシュベースサービス（新規追加）
  {
    name: "ポリッシュベース",
    defaultUsageAmount: 0.6,
    productType: "POLISH_BASE" as Type,
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: true,
    isGelService: false,
    requiresBase: false,
    requiresTop: true,
    requiredProducts: [
      {
        type: "POLISH_TOP" as Type,
        defaultAmount: 0.6,
        isRequired: true,
        productRole: "TOP",
        order: 2
      }
    ]
  },
  // ポリッシュトップサービス（新規追加）
  {
    name: "ポリッシュトップ",
    defaultUsageAmount: 0.6,
    productType: "POLISH_TOP" as Type,
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: true,
    isGelService: false,
    requiresBase: true,
    requiresTop: false,
    requiredProducts: [
      {
        type: "POLISH_BASE" as Type,
        defaultAmount: 0.6,
        isRequired: true,
        productRole: "BASE",
        order: 1
      }
    ]
  },
  // ジェルカラーサービス
  {
    name: "ワンカラー（ジェル）",
    defaultUsageAmount: 1.0,
    productType: "GEL_COLOR" as Type,
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: false,
    isGelService: true,
    requiresBase: true,
    requiresTop: true,
    requiredProducts: [
      {
        type: "GEL_BASE" as Type,
        defaultAmount: 1.5,
        isRequired: true,
        productRole: "BASE",
        order: 1
      },
      {
        type: "GEL_TOP" as Type,
        defaultAmount: 1.5,
        isRequired: true,
        productRole: "TOP",
        order: 3
      }
    ]
  },
  // ベースジェルサービス
  {
    name: "ベースジェル",
    defaultUsageAmount: 1.5,
    productType: "GEL_BASE" as Type,
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: false,
    isGelService: true,
    requiresBase: false,
    requiresTop: true,
    requiredProducts: [
      {
        type: "GEL_TOP" as Type,
        defaultAmount: 1.5,
        isRequired: true,
        productRole: "TOP",
        order: 2
      }
    ]
  },
  // トップジェルサービス
  {
    name: "トップジェル",
    defaultUsageAmount: 1.5,
    productType: "GEL_TOP" as Type,
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: false,
    isGelService: true,
    requiresBase: true,
    requiresTop: false,
    requiredProducts: [
      {
        type: "GEL_BASE" as Type,
        defaultAmount: 1.5,
        isRequired: true,
        productRole: "BASE",
        order: 1
      }
    ]
  },
  // ジェルリムーバーサービス（新規追加）
  {
    name: "ジェルリムーバー",
    defaultUsageAmount: 2.0,
    productType: "GEL_REMOVER" as Type,
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: true,
    isGelService: true,
    requiresBase: false,
    requiresTop: false
  }
]

export const DEFAULT_SERVICE_TYPE_CONFIG = {
  LENGTH_RATES: {
    SHORT: 80,
    MEDIUM: 100,
    LONG: 130
  },
  
  DEFAULT_AMOUNTS: {
    POLISH_COLOR: 0.5, // POLISHからPOLISH_COLORに更新
    POLISH_BASE: 0.6,  // 新規追加
    POLISH_TOP: 0.6,   // 新規追加
    GEL_COLOR: 1.0,
    GEL_BASE: 1.5,
    GEL_TOP: 1.5,
    GEL_REMOVER: 2.0   // 新規追加
  }
} as const

export class DefaultServiceTypeUtils {
  static isDefaultServiceType(name: string): boolean {
    return DEFAULT_SERVICE_TYPES.some(type => type.name === name)
  }

  static findByProductType(type: Type): DefaultServiceType | undefined {
    // 文字列として比較するために変換
    const typeString = String(type);
    return DEFAULT_SERVICE_TYPES.find(st => String(st.productType) === typeString);
  }

  static getRequiredProductTypes(name: string): Type[] {
    const serviceType = DEFAULT_SERVICE_TYPES.find(st => st.name === name)
    if (!serviceType || !serviceType.requiredProducts) return []
    
    return serviceType.requiredProducts
      .filter(rp => rp.isRequired)
      .map(rp => rp.type)
  }

  static isGelService(type: Type): boolean {
    // 安全に文字列として比較
    const typeString = String(type);
    return ["GEL_COLOR", "GEL_BASE", "GEL_TOP", "GEL_REMOVER"].includes(typeString);
  }
  
  static isPolishService(type: Type): boolean {
    // 安全に文字列として比較
    const typeString = String(type);
    return ["POLISH_COLOR", "POLISH_BASE", "POLISH_TOP"].includes(typeString);
  }
}