import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import StoreStatistics from '@/components/store/store-statistics'
import ProductUsageStatistics from '@/components/store/product-usage-statistics'

interface StatisticsPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function StatisticsPage({ params }: StatisticsPageProps) {
  const resolvedParams = await params
  const storeId = resolvedParams.id

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">統計分析</h2>
      </div>
      <div className="grid gap-4">
        <Suspense
          fallback={
            <Card className="w-full animate-pulse">
              <div className="h-96" />
            </Card>
          }
        >
          <ProductUsageStatistics storeId={storeId} />
        </Suspense>
      </div>
    </div>
  )
}