// @/types/api.ts

export type QueryKeys = {
  store: ['store', string]
  products: ['products', string]
  staff: ['staff', string]
  serviceTypes: ['serviceTypes', string]
  usages: ['usages', string]
  invitations: ['invitations', string]
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
  isGelService: boolean
  requiresBase: boolean
  requiresTop: boolean
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
  productRole?: string | null  // "BASE", "COLOR", "TOP" などの役割を指定
  order: number        // 使用順序
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

// 既存の型定義に追加

export type Invitation = {
  id: string
  token: string
  email?: string | null
  storeId: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
  expires: string
  used: boolean
  createdAt: string
  updatedAt: string
}

export type CreateInvitationRequest = {
  email?: string
  role?: 'ADMIN' | 'MANAGER' | 'STAFF'
}

export type CreateInvitationResponse = {
  invitation: Invitation
  inviteUrl: string
}

export type GetInvitationsResponse = {
  invitations: Invitation[]
}

// 招待トークン検証のレスポンス
export type ValidateInvitationResponse = {
  isValid: boolean
  invitation?: {
    storeId: string
    storeName: string
    role: 'ADMIN' | 'MANAGER' | 'STAFF'
    email: string | null
  }
  error?: string
}

// 招待削除のリクエスト
export type DeleteInvitationRequest = {
  token: string
}