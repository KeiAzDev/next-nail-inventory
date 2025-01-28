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

export type Product = {
  id: string
  brand: string
  productName: string
  colorCode: string
  colorName: string
  type: 'POLISH' | 'GEL'
  price: number
  quantity: number
  usageCount: number
  lastUsed?: string
  averageUsesPerMonth?: number
  estimatedDaysLeft?: number
  minStockAlert: number
  storeId: string
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