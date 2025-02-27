'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Package, TrendingUp } from 'lucide-react'
import type { Product } from '@/types/api'
import { useServiceTypePrediction } from '@/hooks/queries/use-predictions'
import { isLiquidProduct } from '@/types/api'

interface StockStatusProps {
  product: Product
  storeId: string
  compact?: boolean
  showDetails?: boolean
}

export default function StockStatus({ 
  product, 
  storeId,
  compact = false,
  showDetails = false 
}: StockStatusProps) {
  const [remainingPercentage, setRemainingPercentage] = useState<number>(0)
  const inUseLot = product.lots?.find(lot => lot.isInUse)
  const isLiquid = isLiquidProduct(product.type)
  
  // 製品に関連するサービスタイプの予測を取得
  const serviceTypeId = product.serviceTypeProducts?.[0]?.serviceTypeId
  const { prediction } = useServiceTypePrediction(storeId, serviceTypeId ?? '')
  
  useEffect(() => {
    if (isLiquid && inUseLot && product.capacity) {
      const percentage = Math.round((inUseLot.currentAmount ?? 0) / product.capacity * 100)
      setRemainingPercentage(Math.max(0, Math.min(100, percentage)))
    }
  }, [inUseLot, product.capacity, isLiquid])

  const getStatusInfo = () => {
    // 液体商品（ポリッシュ、ジェルなど）の在庫状態
    if (isLiquid) {
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
    // 非液体商品（ツール、消耗品など）の在庫状態
    else {
      if (product.totalQuantity > product.minStockAlert * 2) {
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-500',
          label: '十分な在庫'
        }
      } else if (product.totalQuantity > product.minStockAlert) {
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-500',
          label: '在庫あり'
        }
      } else if (product.totalQuantity > 0) {
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500',
          label: '在庫わずか'
        }
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-500',
          label: '在庫なし'
        }
      }
    }
  }

  const status = getStatusInfo()
  
  // アラート条件の計算
  let showBasicAlert = false
  if (isLiquid) {
    // 液体商品のアラート（容量ベース）
    showBasicAlert = !product.lotQuantity && 
      remainingPercentage < product.recommendedAlertPercentage
  } else {
    // 非液体商品のアラート（個数ベース）
    showBasicAlert = product.totalQuantity <= product.minStockAlert
  }
  
  // 予測に基づくアラート条件
  const showPredictionAlert = prediction && 
    prediction.confidence > 70 && 
    inUseLot?.currentAmount && 
    prediction.predictedUsage > inUseLot.currentAmount

  const containerClasses = compact 
    ? 'p-2 rounded-md bg-white'
    : 'p-4 rounded-lg border bg-white shadow-sm'

  // 非液体商品の在庫残量パーセンテージを計算
  const nonLiquidPercentage = product.minStockAlert > 0 
    ? Math.min(100, Math.round((product.totalQuantity / (product.minStockAlert * 2)) * 100))
    : product.totalQuantity > 0 ? 100 : 0

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-sm">
            在庫状態
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showBasicAlert && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          {showPredictionAlert && isLiquid && (
            <TrendingUp className="h-4 w-4 text-blue-500" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* 商品状態表示 */}
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs ${status.color} bg-opacity-10`}>
            {status.label}
          </div>
          {isLiquid ? (
            <span className="text-sm text-gray-600">
              未使用: {product.lotQuantity}個
            </span>
          ) : (
            <span className="text-sm text-gray-600">
              在庫数: {product.totalQuantity}個
            </span>
          )}
        </div>

        {/* 液体商品の使用中ロット表示 */}
        {isLiquid && inUseLot && (
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

        {/* 非液体商品の在庫表示 */}
        {!isLiquid && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">アラート在庫数: {product.minStockAlert}個</span>
              <span className="font-medium">{nonLiquidPercentage}%</span>
            </div>
            <Progress 
              value={nonLiquidPercentage}
              className="h-2"
              indicatorClassName={status.bgColor}
            />
          </div>
        )}

        {/* 予測情報（詳細モードで液体商品のみ） */}
        {showDetails && isLiquid && prediction && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              使用予測
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">予測使用量:</span>
                <span className="ml-2 font-medium">
                  {prediction.predictedUsage.toFixed(1)}{product.capacityUnit}/月
                </span>
              </div>
              <div>
                <span className="text-gray-500">予測信頼度:</span>
                <span className="ml-2 font-medium">
                  {prediction.confidence.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 詳細情報 */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">総在庫数:</span>
                <span className="ml-2 font-medium">{product.totalQuantity}個</span>
              </div>
              {isLiquid && product.averageUsesPerMonth && (
                <div>
                  <span className="text-gray-500">月平均使用:</span>
                  <span className="ml-2 font-medium">
                    {product.averageUsesPerMonth}回
                  </span>
                </div>
              )}
              {isLiquid && product.capacity && (
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