import type { Store, Product, StaffMember, ServiceType, Usage, NailLength, CreateInvitationRequest, CreateInvitationResponse, Invitation, ValidateInvitationResponse, CreateUsageRequest } from '@/types/api'

export async function fetchStoreDetails(storeId: string): Promise<Store> {
  const response = await fetch(`/api/stores/${storeId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch store details')
  }
  return response.json()
}

export async function fetchStoreProducts(storeId: string): Promise<Product[]> {
  const response = await fetch(`/api/stores/${storeId}/products`)
  if (!response.ok) {
    throw new Error('Failed to fetch store products')
  }
  return response.json()
}

export async function fetchStoreStaff(storeId: string): Promise<StaffMember[]> {
  const response = await fetch(`/api/stores/${storeId}/staff`)
  if (!response.ok) {
    throw new Error('Failed to fetch store staff')
  }
  return response.json()
}

export async function updateStoreDetails(
  storeId: string,
  data: Partial<Store>
): Promise<Store> {
  const response = await fetch(`/api/stores/${storeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to update store details')
  }
  
  return response.json()
}

export async function fetchServiceTypes(storeId: string): Promise<ServiceType[]> {
  const response = await fetch(`/api/stores/${storeId}/service-types`)
  if (!response.ok) {
    throw new Error('Failed to fetch service types')
  }
  const data = await response.json()
  
  if (process.env.NODE_ENV === 'development') {
  }
  
  return data.serviceTypes // APIレスポンスから配列を取得
}

export async function recordUsage(
  storeId: string,
  data: CreateUsageRequest,
): Promise<Usage> {
  const response = await fetch(`/api/stores/${storeId}/usages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to record usage')
  }
  
  return response.json()
}

export async function createServiceType(storeId: string, data: any): Promise<ServiceType> {
  const response = await fetch(`/api/stores/${storeId}/service-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create service type')
  }
  
  return response.json()
}

export async function fetchProductDetails(storeId: string, productId: string): Promise<Product> {
  const response = await fetch(`/api/stores/${storeId}/products/${productId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch product details')
  }
  return response.json()
}

export async function deleteProduct(storeId: string, productId: string): Promise<void> {
  const response = await fetch(`/api/stores/${storeId}/products/${productId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete product')
  }
}

export async function createStaffInvitation(
  storeId: string,
  data: CreateInvitationRequest
): Promise<CreateInvitationResponse> {
  const response = await fetch(`/api/stores/${storeId}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create staff invitation')
  }
  
  return response.json()
}

export async function validateInvitation(token: string): Promise<ValidateInvitationResponse> {
  const response = await fetch(`/api/stores/invitations/validate?token=${token}`)
  
  if (!response.ok) {
    throw new Error('Invalid or expired invitation token')
  }
  
  return response.json()
}

export async function getStoreInvitations(storeId: string): Promise<Invitation[]> {
  const response = await fetch(`/api/stores/${storeId}/invitations`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch invitations')
  }
  
  const data = await response.json()
  return data.invitations  // レスポンスから invitations 配列を取り出す
}

export async function deleteInvitation(storeId: string, token: string): Promise<void> {
  const response = await fetch(`/api/stores/${storeId}/invitations`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token })
  })

  if (!response.ok) {
    throw new Error('Failed to delete invitation')
  }
}

export type DeleteInvitationRequest = {
  token: string
}

export type ClimateData = {
  temperature: number
  humidity: number
  timestamp: string
}

export async function fetchClimateData(): Promise<ClimateData> {
  const response = await fetch('/api/climate-data')
  if (!response.ok) {
    throw new Error('Failed to fetch climate data')
  }
  return response.json()
}

export interface StatisticsResponse {
  statistics: {
    serviceTypeId: string
    serviceName: string
    totalUsageCount: number
    totalUsageAmount: number
    monthlyStats: Array<{
      id: string
      serviceTypeId: string
      month: number
      year: number
      totalUsage: number
      averageUsage: number
      usageCount: number
      temperature: number | null
      humidity: number | null
      seasonalRate: number | null
      designUsageStats: Record<string, number> | null
      predictedUsage: number | null
      actualDeviation: number | null
      averageTimePerUse: number | null
      createdAt: string
      updatedAt: string
    }>
  }[]
}

export async function fetchStoreStatistics(storeId: string): Promise<StatisticsResponse> {
  const response = await fetch(`/api/stores/${storeId}/statistics`)
  if (!response.ok) {
    throw new Error('Failed to fetch store statistics')
  }
  return response.json()
}