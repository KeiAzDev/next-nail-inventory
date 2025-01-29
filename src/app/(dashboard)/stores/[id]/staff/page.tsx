// src/app/(dashboard)/stores/[id]/staff/page.tsx
import { Suspense } from 'react'
import StoreStaff from '@/components/store/store-staff'
import { Card } from '@/components/ui/card'

interface StaffPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function StaffPage({ params }: StaffPageProps) {
  const resolvedParams = await params
  const storeId = resolvedParams.id

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">スタッフ管理</h2>
      </div>
      <Suspense
        fallback={
          <Card className="w-full animate-pulse">
            <div className="h-96" />
          </Card>
        }
      >
        <StoreStaff storeId={storeId} />
      </Suspense>
    </div>
  )
}
