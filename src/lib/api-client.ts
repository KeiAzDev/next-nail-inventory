import type { Store, Product, StaffMember, ServiceType, Usage, NailLength } from '@/types/api'

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
  return data.serviceTypes // オブジェクトから配列を取得
}

export async function recordUsage(
  storeId: string,
  data: {
    serviceTypeId: string
    mainProduct: {
      productId: string
      amount: number
    }
    relatedProducts: {
      productId: string
      amount: number
    }[]
    nailLength: NailLength
    date: string
    note?: string
  }
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