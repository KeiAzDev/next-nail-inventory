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
  colorCode: '',
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>商品登録</DialogTitle>
          <DialogDescription>
            新しい商品の情報を入力してください。すべての項目が必須です。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="brand">ブランド名</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              required
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="productName">商品名</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="colorCode">カラーコード</Label>
              <Input
                id="colorCode"
                value={formData.colorCode}
                onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="colorName">カラー名</Label>
              <Input
                id="colorName"
                value={formData.colorName}
                onChange={(e) => setFormData(prev => ({ ...prev, colorName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="type">種類</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'POLISH' | 'GEL') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="種類を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POLISH">ポリッシュ</SelectItem>
                <SelectItem value="GEL">ジェル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="price">価格</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="quantity">数量</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="minStockAlert">アラート在庫数</Label>
            <Input
              id="minStockAlert"
              type="number"
              min="1"
              value={formData.minStockAlert}
              onChange={(e) => setFormData(prev => ({ ...prev, minStockAlert: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '登録中...' : '登録'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}