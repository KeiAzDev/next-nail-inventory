// src/app/(dashboard)/stores/[id]/page.tsx
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'

import StoreHeader from '@/components/store/store-header'
import StoreInventory from '@/components/store/store-inventory'
import StoreStaff from '@/components/store/store-staff'
import { LoadingSpinner } from '@/components/ui/loading'

export default async function StorePage({
  params
}: {
  params: { id: string }
}) {
  const session = await getServerSession()
  
  if (!session) {
    notFound()
  }

  return (
    <div className="space-y-6 p-6">
      <Suspense fallback={<LoadingSpinner />}>
        <StoreHeader storeId={params.id} />
      </Suspense>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<LoadingSpinner />}>
          <StoreInventory storeId={params.id} />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <StoreStaff storeId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}