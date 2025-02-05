//src/components/store/store-inventory.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Product } from '@/types/api'
import { fetchStoreProducts } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import AddProductModal from '@/components/modals/product-modal'
import Link from 'next/link'
import InventoryUsageRecordModal from '../modals/inventory-usage-record-modal'
import StockStatus from '@/components/store/stock-status'

interface StoreInventoryProps {
  storeId: string
}

export default function StoreInventory({ storeId }: StoreInventoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState(false)

  const { data: products, error, isLoading } = useQuery<Product[]>({
    queryKey: ['products', storeId],
    queryFn: () => fetchStoreProducts(storeId)
  })

  // 検索フィルター
  const filteredProducts = products?.filter(product => {
    const searchTarget = `${product.brand} ${product.productName} ${product.colorName}`.toLowerCase()
    return searchTarget.includes(searchQuery.toLowerCase())
  })

  // ローディング状態
  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 rounded-lg w-full"
              />
            ))}
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
          在庫情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>在庫管理</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowUsageModal(true)}
                className="hover:bg-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                使用記録
              </Button>
              <Button className="hover:bg-white" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                商品登録
              </Button>
            </div>
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
              <Link
                href={`/stores/${storeId}/products/${product.id}`}
                key={product.id}
                className="block"
              >
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {product.brand} - {product.productName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {product.colorName} ({product.colorCode})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      容量: {product.capacity}{product.capacityUnit ?? ''} / 
                      平均使用量: {product.averageUsePerService}{product.capacityUnit ?? ''}/回
                    </p>
                  </div>
                  
                  <div className="w-64">
                    <StockStatus product={product} compact />
                  </div>
                </div>
              </Link>
            ))}
            {filteredProducts?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                商品が見つかりません
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <AddProductModal
        storeId={storeId}
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      <InventoryUsageRecordModal
        storeId={storeId}
        open={showUsageModal}
        onOpenChange={setShowUsageModal}
      />
    </>
  )
}