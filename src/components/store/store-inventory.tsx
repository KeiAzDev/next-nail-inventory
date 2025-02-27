//src/components/store/store-inventory.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Product } from '@/types/api'
import { fetchStoreProducts } from '@/lib/api-client'
import { productTypeLabels, isLiquidProduct } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Filter } from 'lucide-react'
import AddProductModal from '@/components/modals/product-modal'
import Link from 'next/link'
import InventoryUsageRecordModal from '../modals/inventory-usage-record-modal'
import StockStatus from '@/components/store/stock-status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StoreInventoryProps {
  storeId: string
}

// 商品タイプのカテゴリーグループ
const productTypeGroups = {
  polish: ["POLISH_COLOR", "POLISH_BASE", "POLISH_TOP"],
  gel: ["GEL_COLOR", "GEL_BASE", "GEL_TOP", "GEL_REMOVER"],
  nailCare: ["NAIL_CARE"],
  tools: ["TOOL"],
  consumables: ["CONSUMABLE", "SANITIZATION", "STORE_SUPPLY"]
};

export default function StoreInventory({ storeId }: StoreInventoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const { data: products, error, isLoading } = useQuery<Product[]>({
    queryKey: ['products', storeId],
    queryFn: () => fetchStoreProducts(storeId)
  })

  // 検索とフィルター
  const filteredProducts = products?.filter(product => {
    // 検索フィルター
    const searchTarget = `${product.brand} ${product.productName} ${product.colorName}`.toLowerCase()
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase())
    
    // カテゴリーフィルター
    let matchesCategory = true
    if (activeCategory !== 'all') {
      if (activeCategory === 'polish') {
        matchesCategory = productTypeGroups.polish.includes(product.type)
      } else if (activeCategory === 'gel') {
        matchesCategory = productTypeGroups.gel.includes(product.type) 
      } else if (activeCategory === 'nailCare') {
        matchesCategory = productTypeGroups.nailCare.includes(product.type)
      } else if (activeCategory === 'tools') {
        matchesCategory = productTypeGroups.tools.includes(product.type)
      } else if (activeCategory === 'consumables') {
        matchesCategory = productTypeGroups.consumables.includes(product.type)
      } else if (activeCategory === 'lowStock') {
        // 在庫が少ない商品
        if (isLiquidProduct(product.type)) {
          // 液体商品は残量で判定
          const inUseLot = product.lots?.find(lot => lot.isInUse)
          if (inUseLot && inUseLot.currentAmount !== null && inUseLot.currentAmount !== undefined) {
            const capacity = product.capacity || 0
            const percentage = capacity > 0 ? (inUseLot.currentAmount / capacity) * 100 : 0
            matchesCategory = percentage <= product.recommendedAlertPercentage || product.lotQuantity === 0
          } else {
            matchesCategory = product.lotQuantity === 0
          }
        } else {
          // その他の商品は数量で判定
          matchesCategory = product.totalQuantity <= product.minStockAlert
        }
      }
    }
    
    // 種類フィルター
    let matchesType = true
    if (typeFilter !== 'all') {
      matchesType = product.type === typeFilter
    }
    
    return matchesSearch && matchesCategory && matchesType
  })

  // カテゴリごとの商品数を計算
  const countByCategory = {
    all: products?.length || 0,
    polish: products?.filter(p => productTypeGroups.polish.includes(p.type)).length || 0,
    gel: products?.filter(p => productTypeGroups.gel.includes(p.type)).length || 0,
    nailCare: products?.filter(p => productTypeGroups.nailCare.includes(p.type)).length || 0,
    tools: products?.filter(p => productTypeGroups.tools.includes(p.type)).length || 0,
    consumables: products?.filter(p => productTypeGroups.consumables.includes(p.type)).length || 0,
    lowStock: products?.filter(p => {
      if (isLiquidProduct(p.type)) {
        const inUseLot = p.lots?.find(lot => lot.isInUse)
        if (inUseLot && inUseLot.currentAmount !== null && inUseLot.currentAmount !== undefined) {
          const capacity = p.capacity || 0
          const percentage = capacity > 0 ? (inUseLot.currentAmount / capacity) * 100 : 0
          return percentage <= p.recommendedAlertPercentage || p.lotQuantity === 0
        }
        return p.lotQuantity === 0
      } else {
        return p.totalQuantity <= p.minStockAlert
      }
    }).length || 0
  }

  // タイプフィルターの選択肢を作成
  const typeOptions = [
    { value: 'all', label: 'すべて' },
    ...Object.entries(productTypeLabels).map(([value, label]) => ({
      value,
      label
    }))
  ]

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
          
          {/* カテゴリータブ - 改善版UI */}
          <div className="mt-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: 'all', label: 'すべて', count: countByCategory.all },
                { id: 'polish', label: 'ポリッシュ', count: countByCategory.polish },
                { id: 'gel', label: 'ジェル', count: countByCategory.gel },
                { 
                  id: 'lowStock', 
                  label: '在庫少', 
                  count: countByCategory.lowStock,
                  highlight: true 
                },
                { id: 'nailCare', label: 'ネイルケア', count: countByCategory.nailCare },
                { id: 'tools', label: 'ツール', count: countByCategory.tools },
                { id: 'consumables', label: '消耗品', count: countByCategory.consumables }
              ].map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`
                    flex items-center px-3 py-1.5 rounded-full text-sm
                    ${activeCategory === category.id 
                      ? category.highlight 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                      : category.highlight 
                        ? 'text-amber-600 border border-amber-200 hover:bg-amber-50' 
                        : 'border text-gray-700 border-gray-200 hover:bg-gray-50'
                    }
                    transition-colors
                  `}
                >
                  {category.label}
                  {category.count > 0 && (
                    <span className={`
                      ml-1.5 px-1.5 py-0.5 text-xs rounded-full
                      ${activeCategory === category.id
                        ? category.highlight
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-blue-200 text-blue-800' 
                        : category.highlight
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-200 text-gray-700'
                      }
                    `}>
                      {category.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="商品を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="w-56">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>{typeFilter === 'all' ? '種類で絞り込み' : productTypeLabels[typeFilter as keyof typeof productTypeLabels]}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredProducts?.map(product => (
                <Link
                  href={`/stores/${storeId}/products/${product.id}`}
                  key={product.id}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-medium">
                          {product.brand} - {product.productName}
                        </h3>
                        <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                          {productTypeLabels[product.type]}
                        </span>
                      </div>
                      
                      {isLiquidProduct(product.type) ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {product.colorName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            容量: {product.capacity}{product.capacityUnit ?? ''} / 
                            平均使用量: {product.averageUsePerService}{product.capacityUnit ?? ''}/回
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          在庫数: {product.totalQuantity} / 
                          最小在庫数: {product.minStockAlert}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-64">
                      <StockStatus product={product} storeId={storeId} compact  />
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
          </div>
        </CardHeader>
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