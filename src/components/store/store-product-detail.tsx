'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Package2 } from "lucide-react"
import { fetchProductDetails } from "@/lib/api-client"
import StockStatus from "@/components/store/stock-status"
import type { Product } from "@/types/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import ProductUsageRecordModal from "../modals/product-usage-record-modal"

interface StoreProductDetailProps {
  storeId: string
  productId: string
}

export default function StoreProductDetail({
  storeId,
  productId,
}: StoreProductDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const {
    data: product,
    error,
    isLoading,
  } = useQuery<Product>({
    queryKey: ["product", productId],
    queryFn: () => fetchProductDetails(storeId, productId),
  })

  // ローディング状態
  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // エラー状態
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          商品情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  if (!product) {
    return (
      <Alert>
        <AlertDescription>商品が見つかりませんでした。</AlertDescription>
      </Alert>
    )
  }

  const currentLot = product.lots?.find(lot => lot.isInUse)
  const unusedLots = product.lots?.filter(lot => !lot.isInUse) ?? []

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              <CardTitle>基本情報</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowUsageModal(true)}>
                使用記録
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                削除
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">ブランド</p>
                <p className="font-medium">{product.brand}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">商品名</p>
                <p className="font-medium">{product.productName}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">カラー</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: product.colorCode }}
                  />
                  <p className="font-medium">{product.colorName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">種類</p>
                <p className="font-medium">{product.type}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 在庫状態 */}
      <Card>
        <CardHeader>
          <CardTitle>在庫状態</CardTitle>
        </CardHeader>
        <CardContent>
          <StockStatus product={product} showDetails />
        </CardContent>
      </Card>

      {/* ロット情報 */}
      <Card>
        <CardHeader>
          <CardTitle>ロット管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 使用中ロット */}
            {currentLot && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">使用中のロット</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">開始日</p>
                    <p>{new Date(currentLot.startedAt!).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">現在の残量</p>
                    <p>
                      {currentLot.currentAmount?.toFixed(1)}
                      {product.capacityUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">使用期間</p>
                    <p>{Math.floor((Date.now() - new Date(currentLot.startedAt!).getTime()) / (1000 * 60 * 60 * 24))}日</p>
                  </div>
                </div>
              </div>
            )}

            {/* 未使用ロット */}
            {unusedLots.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">未使用ロット ({unusedLots.length}個)</h4>
                <div className="grid grid-cols-2 gap-4">
                  {unusedLots.map((lot) => (
                    <div
                      key={lot.id}
                      className="border rounded p-3"
                    >
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">登録日</p>
                          <p>{new Date(lot.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">容量</p>
                          <p>{product.capacity}{product.capacityUnit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!currentLot && unusedLots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                ロット情報がありません
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* モーダル類 */}
      <ProductUsageRecordModal
        open={showUsageModal}
        onOpenChange={setShowUsageModal}
        storeId={storeId}
        product={product}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品の削除</DialogTitle>
            <DialogDescription>
              この商品を削除してもよろしいですか？
              <br />
              関連する全てのデータ（使用記録、ロット情報など）が削除されます。
              <br />
              この操作は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                try {
                  await fetch(`/api/stores/${storeId}/products/${productId}`, {
                    method: 'DELETE'
                  })
                  toast({
                    title: "商品を削除しました",
                    description: "商品が正常に削除されました。",
                  })
                  router.push(`/stores/${storeId}/inventory`)
                } catch (error) {
                  toast({
                    variant: "destructive",
                    title: "エラー",
                    description: "商品の削除に失敗しました。",
                  })
                }
              }}
            >
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}