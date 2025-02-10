// src/app/(dashboard)/stores/[id]/statistics/page.tsx
import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ServiceTypeStatistics from '@/components/store/service-type-statistics'
import ProductUsageStatistics from '@/components/store/product-usage-statistics'

interface StatisticsPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function StatisticsPage({ params }: StatisticsPageProps) {
  const resolvedParams = await params
  const { id: storeId } = resolvedParams

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">統計分析</h2>
      </div>

      <Tabs defaultValue="product" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="product">商品別統計</TabsTrigger>
          <TabsTrigger value="service">施術別統計</TabsTrigger>
        </TabsList>
        
        <TabsContent value="product">
          <Suspense
            fallback={
              <Card className="w-full animate-pulse">
                <div className="h-96" />
              </Card>
            }
          >
            <ProductUsageStatistics storeId={storeId} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="service">
          <Suspense
            fallback={
              <Card className="w-full animate-pulse">
                <div className="h-96" />
              </Card>
            }
          >
            <ServiceTypeStatistics storeId={storeId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}