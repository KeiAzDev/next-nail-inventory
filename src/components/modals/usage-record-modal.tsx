//src/components/modals/usage-record-modal.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { NailLength, ServiceType, Product } from '@/types/api'
import { fetchServiceTypes, fetchStoreProducts, recordUsage } from '@/lib/api-client'

interface UsageRecordModalProps {
  storeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UsageFormData {
  serviceTypeId: string
  mainProduct: {
    productId: string
    amount: number
  }
  relatedProducts: {
    productId: string
    amount: number
  }[]
  nailLength: NailLength
  date: string
  note?: string
}

const initialFormData: UsageFormData = {
  serviceTypeId: '',
  mainProduct: {
    productId: '',
    amount: 0,
  },
  relatedProducts: [],
  nailLength: 'MEDIUM',
  date: new Date().toISOString().split('T')[0],
  note: '',
}

export default function UsageRecordModal({
  storeId,
  open,
  onOpenChange,
}: UsageRecordModalProps) {
  const [formData, setFormData] = useState<UsageFormData>(initialFormData)
  const queryClient = useQueryClient()

  // サービスタイプの取得
  const { 
    data: serviceTypes,
    error: serviceTypesError,
    isLoading: isLoadingServiceTypes 
  } = useQuery<ServiceType[]>({
    queryKey: ['serviceTypes', storeId],
    queryFn: () => fetchServiceTypes(storeId),
    enabled: open, // モーダルが開いている時のみ実行
  })

  // 商品の取得
  const { 
    data: products,
    error: productsError,
    isLoading: isLoadingProducts 
  } = useQuery<Product[]>({
    queryKey: ['products', storeId],
    queryFn: () => fetchStoreProducts(storeId),
    enabled: open, // モーダルが開いている時のみ実行
  })

  // 使用記録の登録
  const { mutate, isPending } = useMutation({
    mutationFn: (data: UsageFormData) => recordUsage(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['usages', storeId] })
      onOpenChange(false)
      setFormData(initialFormData)
      toast({
        title: '使用記録を登録しました',
        description: '使用記録の登録が完了しました。',
      })
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '使用記録の登録に失敗しました。',
      })
    },
  })

  // サービスタイプ選択時の処理
  const handleServiceTypeChange = (serviceTypeId: string) => {
    const serviceType = serviceTypes?.find((type) => type.id === serviceTypeId)
    if (!serviceType) return

    // メイン商品の使用量を設定
    const defaultAmount = serviceType.defaultUsageAmount
    
    // 関連商品の設定（ベース、トップなど）
    const relatedProducts = serviceType.serviceTypeProducts
      .filter((stp) => stp.isRequired)
      .map((stp) => ({
        productId: stp.productId,
        amount: stp.usageAmount,
      }))

    setFormData((prev) => ({
      ...prev,
      serviceTypeId,
      mainProduct: {
        ...prev.mainProduct,
        amount: defaultAmount,
      },
      relatedProducts,
    }))
  }

  // 爪の長さによる使用量の調整
  const handleNailLengthChange = (nailLength: NailLength) => {
    const serviceType = serviceTypes?.find(
      (type) => type.id === formData.serviceTypeId
    )
    if (!serviceType) return

    const getLengthRate = (length: NailLength) => {
      switch (length) {
        case 'SHORT': return serviceType.shortLengthRate
        case 'MEDIUM': return serviceType.mediumLengthRate
        case 'LONG': return serviceType.longLengthRate
      }
    }

    const rate = getLengthRate(nailLength) / 100

    // メイン商品の使用量を調整
    const mainAmount = serviceType.defaultUsageAmount * rate

    // 関連商品の使用量を調整
    const relatedProducts = formData.relatedProducts.map((rp) => {
      const serviceTypeProduct = serviceType.serviceTypeProducts.find(
        (stp) => stp.productId === rp.productId
      )
      return {
        ...rp,
        amount: serviceTypeProduct
          ? serviceTypeProduct.usageAmount * rate
          : rp.amount,
      }
    })

    setFormData((prev) => ({
      ...prev,
      nailLength,
      mainProduct: {
        ...prev.mainProduct,
        amount: mainAmount,
      },
      relatedProducts,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(formData)
  }

  // ローディング状態の表示
  const LoadingDialog = () => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>使用記録</DialogTitle>
          <div className="w-full h-40 flex items-center justify-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )

  // エラー状態の表示
  const ErrorDialog = () => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>使用記録</DialogTitle>
        </DialogHeader>
        <Alert variant="destructive">
          <AlertDescription>
            データの取得に失敗しました。再度お試しください。
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] bg-white overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white py-2 z-10 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            使用記録
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            施術での商品使用記録を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-1 pb-4">
          <div className="space-y-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="serviceType" className="text-gray-700">
                施術タイプ
              </Label>
              <Select
                value={formData.serviceTypeId}
                onValueChange={handleServiceTypeChange}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                  <SelectValue placeholder="施術タイプを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {serviceTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="nailLength" className="text-gray-700">
                爪の長さ
              </Label>
              <Select
                value={formData.nailLength}
                onValueChange={(value: NailLength) =>
                  handleNailLengthChange(value)
                }
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                  <SelectValue placeholder="爪の長さを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="SHORT">ショート</SelectItem>
                  <SelectItem value="MEDIUM">ミディアム</SelectItem>
                  <SelectItem value="LONG">ロング</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="date" className="text-gray-700">
                施術日
              </Label>
              <Input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="border-gray-200"
                required
              />
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="note" className="text-gray-700">
                メモ
              </Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
                className="border-gray-200"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-white pt-4 flex justify-end gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-50 hover:bg-gray-100 text-gray-700"
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