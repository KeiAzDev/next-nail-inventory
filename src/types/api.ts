// @/types/api.ts

export type QueryKeys = {
  store: ['store', string]
  products: ['products', string]
  staff: ['staff', string]
  serviceTypes: ['serviceTypes', string]
  usages: ['usages', string]
  invitations: ['invitations', string]
  predictions: ['predictions', string]
  statistics: ['statistics', string, string] // storeId, serviceTypeId
  productStatistics: ['productStatistics', string, number, number]
  serviceTypeStatistics: ['serviceTypeStatistics', string, number?, number?]
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
  serviceTypeProducts?: ServiceTypeProduct[]
}

export interface ProductLot {
  id: string
  productId: string
  isInUse: boolean
  currentAmount?: number | null
  startedAt?: string | null
  createdAt: string
  updatedAt: string
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
  designVariant?: string
  designUsageRate?: number
  monthlyStats?: MonthlyServiceStat[]
  createdAt: string
  updatedAt: string
}

export type MonthlyServiceStat = {
  id: string
  serviceTypeId: string
  month: number
  year: number
  totalUsage: number
  averageUsage: number
  usageCount: number
  temperature?: number | null
  humidity?: number | null
  seasonalRate: number | null
  designUsageStats: Record<string, number> | null
  predictedUsage: number | null
  actualDeviation: number | null
  averageTimePerUse: number | null
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
    isCustom: boolean     // 追加: カスタム値かどうか
    defaultAmount?: number // 追加: デフォルト値
  }
  relatedProducts: {
    productId: string
    amount: number
    isCustom: boolean     // 追加: カスタム値かどうか
    defaultAmount?: number // 追加: デフォルト値
  }[]
  serviceTypeId: string
  nailLength: NailLength
  note?: string
  adjustmentReason?: string  // 追加: 調整理由
  designVariant?: string
  temperature?: number
  humidity?: number
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

export interface StatisticsResponse {
  statistics: {
    serviceTypeId: string
    serviceName: string
    totalUsageCount: number
    totalUsageAmount: number
    monthlyStats: Array<MonthlyServiceStat>
  }[]
}

export interface ClimateData {
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface ServiceTypeUsage {
  serviceTypeId: string;
  serviceTypeName: string;
  amount: number;
  count: number;
}

export interface ProductStatistics {
  productId: string;
  // 商品情報を追加
  brand: string;
  productName: string;
  colorName: string;
  type: ProductType;  // 既存のProductType enumを使用
  capacityUnit: string | null;
  // 既存のフィールド
  year: number;
  month: number;
  totalUsage: number;
  usageCount: number;
  serviceTypeUsage: ServiceTypeUsage[];
  remainingAmount: number;
  estimatedDaysLeft: number | null;
  lastUsedAt: string | null;
  predictedUsage: number | null;
  predictionConfidence: number | null;
}

export interface ProductStatisticsResponse {
  statistics: ProductStatistics[];
  totalProducts: number;
  hasNextPage: boolean;
}

export interface ColorUsageStatistics {
  productId: string;
  productName: string;
  colorName: string;
  colorCode: string;
  usageCount: number;
  totalAmount: number;
}

export interface MonthlyColorTrend {
  month: string;
  usageCount: number;
  popularColors: Array<{
    colorName: string;
    usageCount: number;
  }>;
}

export interface ServiceTypeStatistics {
  serviceTypeId: string;
  serviceName: string;
  totalUsageCount: number;
  colorUsage: ColorUsageStatistics[];
  monthlyTrend?: MonthlyColorTrend[];
}

export interface ServiceTypeStatisticsResponse {
  statistics: ServiceTypeStatistics[];
}
