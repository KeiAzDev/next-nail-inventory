import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { validateStoreAccess } from '@/lib/auth'

import StoreHeader from '@/components/store/store-header'
import StoreInventory from '@/components/store/store-inventory'
import StoreStaff from '@/components/store/store-staff'
import { LoadingSpinner } from '@/components/ui/loading'

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function StorePage({ params }: PageProps) {
  // paramsそのものを非同期で解決
  const resolvedParams = await params
  await validateStoreAccess(resolvedParams.id)

  return (
    <div className="container mx-auto space-y-6 p-4 lg:p-6">
      <Suspense fallback={<LoadingSpinner />}>
        <StoreHeader storeId={resolvedParams.id} />
      </Suspense>
      
      <div className="grid gap-6 lg:grid-cols-2 xl:gap-8">
        <Suspense fallback={<LoadingSpinner />}>
          <StoreInventory storeId={resolvedParams.id} />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <StoreStaff storeId={resolvedParams.id} />
        </Suspense>
      </div>
    </div>
  )
}