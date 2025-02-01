// @/types/api.ts

export type QueryKeys = {
  store: ['store', string]
  products: ['products', string]
  staff: ['staff', string]
  serviceTypes: ['serviceTypes', string]
  usages: ['usages', string]
}

export type Store = {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  adminEmail: string
  createdAt: string
  updatedAt: string
}

export type ProductType = 'POLISH' | 'GEL_COLOR' | 'GEL_BASE' | 'GEL_TOP'

// @/types/api.ts の Product 型を修正
export type Product = {
  id: string
  brand: string
  productName: string
  colorCode: string
  colorName: string
  type: ProductType
  price: number
  // quantity を削除（totalQuantity に置き換え）
  // 容量関連フィールド
  capacity: number | null
  capacityUnit: string | null
  averageUsePerService: number | null
  recommendedAlertPercentage: number
  // 既存のフィールド
  usageCount: number
  lastUsed: string | null
  averageUsesPerMonth: number | null
  estimatedDaysLeft: number | null
  minStockAlert: number
  storeId: string
  createdAt: string
  updatedAt: string
  // 新規フィールド
  totalQuantity: number
  inUseQuantity: number
  lotQuantity: number
  lots?: ProductLot[]
}

export interface ProductLot {
  id: string
  productId: string
  isInUse: boolean
  currentAmount?: number
  startedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type StaffMember = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
  storeId: string
  createdAt: string
  updatedAt: string
}

export type NailLength = 'SHORT' | 'MEDIUM' | 'LONG'

export type ServiceType = {
  id: string
  name: string
  defaultUsageAmount: number
  productType: ProductType
  shortLengthRate: number
  mediumLengthRate: number
  longLengthRate: number
  allowCustomAmount: boolean
  serviceTypeProducts: ServiceTypeProduct[]
  storeId: string
  createdAt: string
  updatedAt: string
}

export type ServiceTypeProduct = {
  id: string
  serviceTypeId: string
  productId: string
  usageAmount: number
  isRequired: boolean
  createdAt: string
  updatedAt: string
  product?: Product
}

export type Usage = {
  id: string
  date: string
  usageAmount: number
  nailLength: NailLength
  isCustomAmount: boolean
  serviceTypeId: string
  productId: string
  note?: string
  createdAt: string
  relatedUsages: RelatedProductUsage[]
}

export type RelatedProductUsage = {
  id: string
  usageId: string
  productId: string
  amount: number
  createdAt: string
}

// 新規追加: 使用記録作成リクエストの型定義
export type CreateUsageRequest = {
  date: string
  mainProduct: {
    productId: string
    amount: number
  }
  relatedProducts: {
    productId: string
    amount: number
  }[]
  serviceTypeId: string
  nailLength: NailLength
  note?: string
}