import type { Store, Product, StaffMember, ServiceType, Usage, NailLength, CreateInvitationRequest, CreateInvitationResponse, Invitation, ValidateInvitationResponse, CreateUsageRequest, ClimateData,
  StatisticsResponse, ProductStatisticsResponse
} from '@/types/api'

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

export async function fetchClimateData(lat: number, lon: number): Promise<ClimateData> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString()
  });
  
  const url = `/api/climate-data?${params.toString()}`;  
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '不明なエラー' }));
    throw new Error(errorData.error || '気象データの取得に失敗しました');
  }
  
  const data = await response.json();
  return data;
}

export async function fetchStoreStatistics(storeId: string): Promise<StatisticsResponse> {
  const response = await fetch(`/api/stores/${storeId}/statistics`)
  if (!response.ok) {
    throw new Error('Failed to fetch store statistics')
  }
  return response.json()
}

export async function fetchProductStatistics(
  storeId: string,
  year?: number,
  month?: number,
  page: number = 1,
  limit: number = 10
): Promise<ProductStatisticsResponse> {
  const searchParams = new URLSearchParams();
  if (year) searchParams.set('year', year.toString());
  if (month) searchParams.set('month', month.toString());
  searchParams.set('page', page.toString());
  searchParams.set('limit', limit.toString());

  const response = await fetch(
    `/api/stores/${storeId}/statistics?${searchParams.toString()}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch product statistics');
  }

  return response.json();
}