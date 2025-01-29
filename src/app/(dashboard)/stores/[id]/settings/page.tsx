// src/app/(dashboard)/stores/[id]/settings/page.tsx
import { Suspense } from 'react'
import StoreSettings from '@/components/store/store-settings'
import { Card } from '@/components/ui/card'

interface SettingsPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const resolvedParams = await params
  const storeId = resolvedParams.id

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">店舗設定</h2>
      </div>
      <Suspense
        fallback={
          <Card className="w-full animate-pulse">
            <div className="h-96" />
          </Card>
        }
      >
        <StoreSettings storeId={storeId} />
      </Suspense>
    </div>
  )
}