import type { Store, Product, StaffMember } from '@/types/api'

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