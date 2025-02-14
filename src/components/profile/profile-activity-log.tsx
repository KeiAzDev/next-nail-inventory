// /src/components/profile/profile-activity-log.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchStaffActivities } from '@/lib/api-client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Activity } from '@/types/api'

interface ProductUseMetadata {
  productName: string
  amount: number
  unit: string | null
  serviceTypeName: string
  isCustomAmount: boolean
  relatedProducts: Array<{
    productId: string
    amount: number
    isCustomAmount: boolean
  }>
}

interface ProductUpdateMetadata {
  productName: string
  brand: string
  capacityUnit?: string
  updates: {
    productName?: { old: string; new: string }
    brand?: { old: string; new: string }
    colorName?: { old: string; new: string }
    price?: { old: number; new: number }
    capacity?: { old: number | null; new: number | null }
    capacityUnit?: { old: string | null; new: string | null }
  }
}

interface ProductCreateMetadata {
  productName: string
  brand: string
  type: string
  colorName: string
  capacity: number | null
  capacityUnit: string | null
  quantity: number
}

interface ProductDeleteMetadata {
  productName: string
  brand: string
  type: string
  colorName: string
  deletedAt: string
}

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
      case 'PRODUCT_USE': {
        const metadata = activity.metadata as ProductUseMetadata | undefined
        if (!metadata) return activity.action
  
        const mainMessage = `${metadata.productName}を使用しました（${metadata.amount}${metadata.unit}）`
        
        if (metadata.relatedProducts.length > 0) {
          const relatedMessage = `関連商品: ${metadata.relatedProducts
            .map(rp => `${rp.amount}${metadata.unit}`)
            .join(', ')}`
          return `${mainMessage} ${relatedMessage}`
        }
        
        return mainMessage
      }
  
      case 'PRODUCT_CREATE': {
        const metadata = activity.metadata as ProductCreateMetadata | undefined
        if (!metadata) return activity.action
  
        return `${metadata.brand} ${metadata.productName}を登録しました（${metadata.quantity}個）`
      }
  
      case 'PRODUCT_UPDATE': {
        const metadata = activity.metadata as ProductUpdateMetadata | undefined
        if (!metadata?.updates || Object.keys(metadata.updates).length === 0) {
          return `${metadata?.productName || '商品'}を更新しました`
        }
  
        const updateDetails = Object.entries(metadata.updates)
          .map(([field, value]) => {
            if (!value) return null
            
            switch (field) {
              case 'productName':
                return `商品名を「${value.old}」から「${value.new}」に変更`
              case 'brand':
                return `ブランドを「${value.old}」から「${value.new}」に変更`
              case 'colorName':
                return `カラー名を「${value.old}」から「${value.new}」に変更`
              case 'price':
                return `価格を${value.old}円から${value.new}円に変更`
              case 'capacity':
                return `容量を${value.old}から${value.new}${metadata.capacityUnit}に変更`
              default:
                return null
            }
          })
          .filter((detail): detail is string => detail !== null)
          .join('、')
  
        return `${metadata.productName}を更新しました（${updateDetails}）`
      }
  
      case 'PRODUCT_DELETE': {
        const metadata = activity.metadata as ProductDeleteMetadata | undefined
        if (!metadata) return activity.action
  
        return `${metadata.brand} ${metadata.productName}（${metadata.colorName}）を削除しました`
      }
  
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