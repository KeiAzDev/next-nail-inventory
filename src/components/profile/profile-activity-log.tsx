// /src/components/profile/profile-activity-log.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchStaffActivities } from '@/lib/api-client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Activity } from '@/types/api'

export default function ProfileActivityLog() {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading } = useQuery({
    queryKey: ['staffActivities', session?.user.storeId, session?.user.id, page],
    queryFn: () => fetchStaffActivities(session!.user.storeId, session!.user.id, { page, limit }),
    enabled: !!session?.user.id
  })

  const formatActivityMessage = (activity: Activity) => {
    switch (activity.type) {
      case 'PRODUCT_USE':
        return `${activity.metadata?.productName}を使用しました（${activity.metadata?.amount}${activity.metadata?.unit}）`
      case 'PRODUCT_CREATE':
        return `商品「${activity.metadata?.productName}」を登録しました`
      case 'PRODUCT_UPDATE':
        return `商品「${activity.metadata?.productName}」を更新しました`
      case 'PRODUCT_DELETE':
        return `商品「${activity.metadata?.productName}」を削除しました`
      default:
        return activity.action
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>使用履歴</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data?.activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-4 border-b border-gray-200 pb-4 last:border-0"
            >
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    {formatActivityMessage(activity)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(activity.createdAt).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* ページネーション */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                前へ
              </Button>
              <span className="text-sm text-gray-600">
                {page} / {data.pagination.totalPages} ページ
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
              >
                次へ
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}