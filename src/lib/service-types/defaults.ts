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
  // ポリッシュサービス
  {
    name: "ポリッシュ",
    defaultUsageAmount: 0.5,
    productType: "POLISH",
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: true,
    isGelService: false,
    requiresBase: false,
    requiresTop: false
  },
  // ジェルカラーサービス
  {
    name: "ジェル",
    defaultUsageAmount: 1.0,
    productType: "GEL_COLOR",
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: false,
    isGelService: true,
    requiresBase: true,
    requiresTop: true,
    requiredProducts: [
      {
        type: "GEL_BASE",
        defaultAmount: 1.5,
        isRequired: true,
        productRole: "BASE",
        order: 1
      },
      {
        type: "GEL_TOP",
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
    productType: "GEL_BASE",
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: false,
    isGelService: true,
    requiresBase: false,
    requiresTop: true,
    requiredProducts: [
      {
        type: "GEL_TOP",
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
    productType: "GEL_TOP",
    shortLengthRate: 80,
    mediumLengthRate: 100,
    longLengthRate: 130,
    allowCustomAmount: false,
    isGelService: true,
    requiresBase: true,
    requiresTop: false,
    requiredProducts: [
      {
        type: "GEL_BASE",
        defaultAmount: 1.5,
        isRequired: true,
        productRole: "BASE",
        order: 1
      }
    ]
  }
]

export const DEFAULT_SERVICE_TYPE_CONFIG = {
  LENGTH_RATES: {
    SHORT: 80,
    MEDIUM: 100,
    LONG: 130
  },
  
  DEFAULT_AMOUNTS: {
    POLISH: 0.5,
    GEL_COLOR: 1.0,
    GEL_BASE: 1.5,
    GEL_TOP: 1.5
  }
} as const

export class DefaultServiceTypeUtils {
  static isDefaultServiceType(name: string): boolean {
    return DEFAULT_SERVICE_TYPES.some(type => type.name === name)
  }

  static findByProductType(type: Type): DefaultServiceType | undefined {
    return DEFAULT_SERVICE_TYPES.find(st => st.productType === type)
  }

  static getRequiredProductTypes(name: string): Type[] {
    const serviceType = DEFAULT_SERVICE_TYPES.find(st => st.name === name)
    if (!serviceType || !serviceType.requiredProducts) return []
    
    return serviceType.requiredProducts
      .filter(rp => rp.isRequired)
      .map(rp => rp.type)
  }

  static isGelService(type: Type): boolean {
    return ["GEL_COLOR", "GEL_BASE", "GEL_TOP"].includes(type)
  }
}