// src/app/(dashboard)/stores/[id]/products/[productId]/page.tsx
import { Suspense } from 'react'
import StoreProductDetail from '@/components/store/store-product-detail'
import { Card } from '@/components/ui/card'

interface ProductDetailPageProps {
  params: Promise<{ id: string; productId: string }> | { id: string; productId: string }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = await params
  const { id: storeId, productId } = resolvedParams

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Suspense
        fallback={
          <Card className="w-full animate-pulse">
            <div className="h-96" />
          </Card>
        }
      >
        <StoreProductDetail storeId={storeId} productId={productId} />
      </Suspense>
    </div>
  )
}