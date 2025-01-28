'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Product } from '@/types/api'
import { fetchStoreProducts } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, AlertTriangle } from 'lucide-react'

interface StoreInventoryProps {
  storeId: string
}

export default function StoreInventory({ storeId }: StoreInventoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: products, error, isLoading } = useQuery<Product[]>({
    queryKey: ['products', storeId],
    queryFn: () => fetchStoreProducts(storeId)
  })

  // 検索フィルター
  const filteredProducts = products?.filter(product => {
    const searchTarget = `${product.brand} ${product.productName} ${product.colorName}`.toLowerCase()
    return searchTarget.includes(searchQuery.toLowerCase())
  })

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="h-96" />
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          在庫情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>在庫管理</CardTitle>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            商品登録
          </Button>
        </div>
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="商品を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredProducts?.map(product => (
            <div
              key={product.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <h3 className="font-medium">
                  {product.brand} - {product.productName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {product.colorName} ({product.colorCode})
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">{product.quantity}個</p>
                  <p className="text-sm text-muted-foreground">
                    残り約{product.estimatedDaysLeft || '-'}日
                  </p>
                </div>
                {product.quantity <= product.minStockAlert && (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </div>
          ))}
          {filteredProducts?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              商品が見つかりません
            </p>
          )}
        </div>
      </CardContent>
      {/* 商品登録モーダルは別コンポーネントとして実装 */}
    </Card>
  )
}