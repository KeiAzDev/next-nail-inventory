'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { fetchStoreDetails } from '@/lib/api-client'
import { Store } from '@/types/api'
import StaffRegistrationForm from '@/components/forms/staff-registration'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function StaffSignUpPage() {
  const searchParams = useSearchParams()
  const storeId = searchParams.get('storeId')

  const { data: store, error, isLoading } = useQuery<Store>({
    queryKey: ['store', storeId],
    queryFn: () => fetchStoreDetails(storeId!),
    enabled: !!storeId
  })

  // パブリックアクセスを許可するためmiddlewareの更新が必要
  useEffect(() => {
    // このページはパブリックアクセス可能
  }, [])

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <div className="h-96" />
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          店舗情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  if (!store) {
    return (
      <Alert>
        <AlertDescription>
          店舗が見つかりませんでした。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <StaffRegistrationForm store={store} />
        </div>
      </div>
    </div>
  )
}