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
  staffProfile: ['staffProfile', string, string] // storeId, staffId
  staffActivities: ['staffActivities', string, string] // storeId, staffId
  sessionStatistics: ['sessionStatistics', string] // storeId
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

// 更新されたProductType型定義
export type ProductType = 
  | 'POLISH_COLOR'
  | 'POLISH_BASE'
  | 'POLISH_TOP'
  | 'GEL_COLOR'
  | 'GEL_BASE'
  | 'GEL_TOP'
  | 'GEL_REMOVER'
  | 'NAIL_CARE'
  | 'TOOL'
  | 'CONSUMABLE'
  | 'SANITIZATION'
  | 'STORE_SUPPLY'

// 製品カテゴリのグループ分け用ヘルパー関数
export const isColorProduct = (type: ProductType): boolean => {
  return [
    'POLISH_COLOR',
    'GEL_COLOR'
  ].includes(type);
};

export const isBaseProduct = (type: ProductType): boolean => {
  return [
    'POLISH_BASE',
    'GEL_BASE'
  ].includes(type);
};

export const isTopProduct = (type: ProductType): boolean => {
  return [
    'POLISH_TOP',
    'GEL_TOP'
  ].includes(type);
};

export const isLiquidProduct = (type: ProductType): boolean => {
  return [
    'POLISH_COLOR',
    'POLISH_BASE',
    'POLISH_TOP',
    'GEL_COLOR',
    'GEL_BASE',
    'GEL_TOP',
    'GEL_REMOVER'
  ].includes(type);
};

export const isNailPolishProduct = (type: ProductType): boolean => {
  return [
    'POLISH_COLOR',
    'POLISH_BASE',
    'POLISH_TOP'
  ].includes(type);
};

export const isGelProduct = (type: ProductType): boolean => {
  return [
    'GEL_COLOR',
    'GEL_BASE',
    'GEL_TOP',
    'GEL_REMOVER'
  ].includes(type);
};

export const needsColorPicker = (type: ProductType): boolean => {
  return [
    'POLISH_COLOR',
    'GEL_COLOR'
  ].includes(type);
};

// 製品タイプの日本語表示用
export const productTypeLabels: Record<ProductType, string> = {
  'POLISH_COLOR': 'ポリッシュカラー',
  'POLISH_BASE': 'ポリッシュベース',
  'POLISH_TOP': 'ポリッシュトップ',
  'GEL_COLOR': 'ジェルカラー',
  'GEL_BASE': 'ジェルベース',
  'GEL_TOP': 'ジェルトップ',
  'GEL_REMOVER': 'ジェルリムーバー',
  'NAIL_CARE': 'ネイルケア用品',
  'TOOL': 'ツール類',
  'CONSUMABLE': '消耗品',
  'SANITIZATION': '衛生用品',
  'STORE_SUPPLY': '店舗備品'
};

// @/types/api.ts の Product 型を修正
export type Product = {
  id: string
  brand: string
  productName: string
  colorCode: string
  colorName: string
  type: ProductType
  price: number
  // 新しいフィールド
  isLiquid: boolean
  useColorPicker: boolean
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
  // ロット管理関連フィールド
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

// 残りの型定義（変更なし）はそのまま...
export type StaffMember = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
  image?: string | null
  phone?: string | null
  shifts?: {
    [key: string]: {
      start?: string
      end?: string
      isOff?: boolean
    }
  } | null
  area?: string | null
  storeId: string
  createdAt: string
  updatedAt: string
}

export type Activity = {
  id: string
  userId: string
  type: string
  action: string
  metadata?: Record<string, any> | null
  createdAt: string
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

export type UpdateStaffRequest = {
  name?: string
  email?: string
  password?: string
}

export type UpdateStaffRoleRequest = {
  role: 'MANAGER' | 'STAFF'
}

export type UpdateStaffProfileRequest = {
  name?: string
  image?: string | null
  phone?: string | null
  shifts?: {
    monday?: {
      start?: string
      end?: string
      isOff?: boolean
    }
    tuesday?: {
      start?: string
      end?: string
      isOff?: boolean
    }
    wednesday?: {
      start?: string
      end?: string
      isOff?: boolean
    }
    thursday?: {
      start?: string
      end?: string
      isOff?: boolean
    }
    friday?: {
      start?: string
      end?: string
      isOff?: boolean
    }
    saturday?: {
      start?: string
      end?: string
      isOff?: boolean
    }
    sunday?: {
      start?: string
      end?: string
      isOff?: boolean
    }
  } | null
  area?: string | null
}

export interface ActivityResponse {
  activities: Activity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SessionDeviceStats {
  deviceType: string;
  count: number;
  percentage: number;
}

export interface SessionBrowserStats {
  browser: string;
  count: number;
  percentage: number;
}

export interface SessionActivityStats {
  timestamp: string;
  type: string;
  count: number;
}

export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  deviceStats: SessionDeviceStats[];
  browserStats: SessionBrowserStats[];
  recentActivities: SessionActivityStats[];
  lastUpdated: string;
}