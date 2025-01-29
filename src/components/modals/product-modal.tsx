'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'

interface AddProductModalProps {
  storeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProductFormData {
  brand: string
  productName: string
  colorCode: string
  colorName: string
  type: 'POLISH' | 'GEL'
  price: number
  quantity: number
  minStockAlert: number
}

const initialFormData: ProductFormData = {
  brand: '',
  productName: '',
  colorCode: '#000000',
  colorName: '',
  type: 'POLISH',
  price: 0,
  quantity: 1,
  minStockAlert: 5
}

export default function AddProductModal({
  storeId,
  open,
  onOpenChange
}: AddProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await fetch(`/api/stores/${storeId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to register product')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      onOpenChange(false)
      setFormData(initialFormData)
      toast({
        title: '商品を登録しました',
        description: '商品の登録が完了しました。',
      })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '商品の登録に失敗しました。',
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">商品登録</DialogTitle>
          <DialogDescription className="text-gray-600">
            新しい商品の情報を入力してください。すべての項目が必須です。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="brand" className="text-gray-700">ブランド名</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              className="border-gray-200"
              required
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="productName" className="text-gray-700">商品名</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              className="border-gray-200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="colorCode" className="text-gray-700">カラーコード</Label>
              <div className="flex gap-2">
                <Input
                  id="colorCode"
                  value={formData.colorCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  className="border-gray-200"
                  required
                />
                <Input
                  type="color"
                  value={formData.colorCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  className="w-12 h-9 p-1 cursor-pointer"
                  aria-label="カラーピッカー"
                />
              </div>
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="colorName" className="text-gray-700">カラー名</Label>
              <Input
                id="colorName"
                value={formData.colorName}
                onChange={(e) => setFormData(prev => ({ ...prev, colorName: e.target.value }))}
                className="border-gray-200"
                required
              />
            </div>
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="type" className="text-gray-700">種類</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'POLISH' | 'GEL') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                <SelectValue placeholder="種類を選択" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 text-gray-800">
                <SelectItem value="POLISH">ポリッシュ</SelectItem>
                <SelectItem value="GEL">ジェル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="price" className="text-gray-700">価格</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="border-gray-200"
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="quantity" className="text-gray-700">数量</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="border-gray-200"
                required
              />
            </div>
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="minStockAlert" className="text-gray-700">アラート在庫数</Label>
            <Input
              id="minStockAlert"
              type="number"
              min="1"
              value={formData.minStockAlert}
              onChange={(e) => setFormData(prev => ({ ...prev, minStockAlert: Number(e.target.value) }))}
              className="border-gray-200"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-gray-50 hover:bg-gray-100 text-gray-800"
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? '登録中...' : '登録'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}