// src/components/store/stock-status.tsx
'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Package } from 'lucide-react'
import type { Product } from '@/types/api'

interface StockStatusProps {
  product: Product
  compact?: boolean
  showDetails?: boolean
}

export default function StockStatus({ 
  product, 
  compact = false,
  showDetails = false 
}: StockStatusProps) {
  const [remainingPercentage, setRemainingPercentage] = useState<number>(0)
  const inUseLot = product.lots?.find(lot => lot.isInUse)
  
  useEffect(() => {
    if (inUseLot && product.capacity) {
      const percentage = Math.round((inUseLot.currentAmount ?? 0) / product.capacity * 100)
      setRemainingPercentage(Math.max(0, Math.min(100, percentage))) // 0-100の範囲に制限
    }
  }, [inUseLot, product.capacity])

  const getStatusInfo = () => {
    if (product.lotQuantity > 0) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        label: '在庫あり'
      }
    }

    if (inUseLot && remainingPercentage > 0) {
      if (remainingPercentage > 50) {
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-500',
          label: '使用中'
        }
      }
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        label: '残量わずか'
      }
    }

    return {
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      label: '在庫なし'
    }
  }

  const status = getStatusInfo()
  const showAlert = !product.lotQuantity && remainingPercentage < product.recommendedAlertPercentage
  const containerClasses = compact 
    ? 'p-2 rounded-md bg-white'
    : 'p-4 rounded-lg border bg-white shadow-sm'

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-sm">
            在庫状態
          </span>
        </div>
        {showAlert && (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        )}
      </div>

      <div className="space-y-3">
        {/* 未使用ロット表示 */}
        {product.lotQuantity > 0 && (
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs ${status.color} bg-opacity-10`}>
              {status.label}
            </div>
            <span className="text-sm text-gray-600">
              未使用: {product.lotQuantity}個
            </span>
          </div>
        )}

        {/* 使用中ロット表示 */}
        {inUseLot && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">使用中</span>
              <span className="font-medium">
                {remainingPercentage}% 
                ({inUseLot.currentAmount?.toFixed(1)}{product.capacityUnit})
              </span>
            </div>
            <Progress 
              value={remainingPercentage}
              className="h-2"
              indicatorClassName={status.bgColor}
            />
            {inUseLot.startedAt && (
              <div className="text-xs text-gray-500">
                使用開始: {new Date(inUseLot.startedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* 詳細情報（オプション） */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">総在庫数:</span>
                <span className="ml-2 font-medium">{product.totalQuantity}個</span>
              </div>
              {product.averageUsesPerMonth && (
                <div>
                  <span className="text-gray-500">月平均使用:</span>
                  <span className="ml-2 font-medium">
                    {product.averageUsesPerMonth}回
                  </span>
                </div>
              )}
              {product.capacity && (
                <div className="col-span-2">
                  <span className="text-gray-500">商品容量:</span>
                  <span className="ml-2 font-medium">
                    {product.capacity}{product.capacityUnit}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}