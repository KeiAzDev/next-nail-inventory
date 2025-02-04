'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calculateUsageAmounts } from '@/lib/usage-calculations'
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
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { NailLength, ServiceType, Product } from '@/types/api'
import { fetchServiceTypes, recordUsage } from '@/lib/api-client'

interface ProductUsageRecordModalProps {
  storeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
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

const initialFormData = (productId: string): UsageFormData => ({
  serviceTypeId: '',
  mainProduct: {
    productId,
    amount: 0,
  },
  relatedProducts: [],
  nailLength: 'MEDIUM',
  date: new Date().toISOString().split('T')[0],
  note: '',
})

export default function ProductUsageRecordModal({
  storeId,
  open,
  onOpenChange,
  product,
}: ProductUsageRecordModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<UsageFormData>(initialFormData(product.id))

  const { 
    data: serviceTypes,
    error: serviceTypesError,
    isLoading: isLoadingServiceTypes 
  } = useQuery<ServiceType[]>({
    queryKey: ['serviceTypes', storeId],
    queryFn: () => fetchServiceTypes(storeId),
    enabled: open,
  })

  const getFilteredServiceTypes = useCallback((serviceTypes: ServiceType[]) => {
    if (["GEL_BASE", "GEL_TOP", "GEL_COLOR"].includes(product.type)) {
      return serviceTypes.filter(st => st.name === "ワンカラー（ジェル）");
    }
    
    if (product.type === "POLISH") {
      return serviceTypes.filter(st => st.name === "ワンカラー（ポリッシュ）");
    }

    return [];
  }, [product.type]);

  useEffect(() => {
    if (serviceTypes && open) {
      const filtered = getFilteredServiceTypes(serviceTypes);
      if (filtered.length === 1) {
        handleServiceTypeChange(filtered[0].id);
      }
    }
  }, [serviceTypes, open, getFilteredServiceTypes]);

  const handleNailLengthChange = (nailLength: NailLength) => {
    const serviceType = serviceTypes?.find(
      type => type.id === formData.serviceTypeId
    );
    if (!serviceType) return;

    const calculations = calculateUsageAmounts(serviceType, nailLength);
    
    setFormData(prev => ({
      ...prev,
      nailLength,
      mainProduct: {
        ...prev.mainProduct,
        amount: calculations.mainAmount
      },
      relatedProducts: calculations.relatedAmounts.filter(ra => ra.productId !== product.id)
    }));
  };

  const handleServiceTypeChange = (serviceTypeId: string) => {
    const serviceType = serviceTypes?.find((type) => type.id === serviceTypeId);
    if (!serviceType) return;

    const calculations = calculateUsageAmounts(serviceType, formData.nailLength);

    setFormData(prev => ({
      ...prev,
      serviceTypeId,
      mainProduct: {
        productId: prev.mainProduct.productId,
        amount: calculations.mainAmount
      },
      relatedProducts: calculations.relatedAmounts.filter(ra => ra.productId !== product.id)
    }));
  };

  const { mutate: submitUsage, isPending } = useMutation({
    mutationFn: (data: UsageFormData) => recordUsage(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['usages', storeId] })
      onOpenChange(false)
      toast({
        title: '使用記録を登録しました',
        description: '使用記録の登録が完了しました。',
      })
    },
    onError: (error) => {
      console.error('Usage record error:', error)
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '使用記録の登録に失敗しました。',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitUsage(formData)
  }

  const filteredServiceTypes = serviceTypes ? getFilteredServiceTypes(serviceTypes) : [];
  const selectedServiceType = filteredServiceTypes.length === 1 ? filteredServiceTypes[0] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-white text-gray-800">
        <DialogHeader>
          <DialogTitle>使用記録</DialogTitle>
          <DialogDescription>
            {product.brand} {product.productName}の使用記録
          </DialogDescription>
        </DialogHeader>

        {isLoadingServiceTypes ? (
          <div className="p-4">データを読み込んでいます...</div>
        ) : serviceTypesError ? (
          <Alert variant="destructive">
            <AlertDescription>
              データの取得に失敗しました。再度お試しください。
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 施術タイプ（読み取り専用） */}
            <div className="grid w-full gap-1.5">
              <Label htmlFor="serviceType">施術タイプ</Label>
              <div className="p-2 border rounded-md bg-gray-50">
                {selectedServiceType?.name || '施術タイプが見つかりません'}
              </div>
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="nailLength">爪の長さ</Label>
              <Select
                value={formData.nailLength}
                onValueChange={handleNailLengthChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHORT">ショート</SelectItem>
                  <SelectItem value="MEDIUM">ミディアム</SelectItem>
                  <SelectItem value="LONG">ロング</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 使用量の表示 */}
            {formData.serviceTypeId && (
              <div className="space-y-2 border rounded-md p-3 bg-gray-50">
                <h4 className="font-medium">使用量</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    {product.productName}: {formData.mainProduct.amount.toFixed(1)}
                    {product.capacityUnit}
                  </p>
                  {formData.relatedProducts.map((rp, index) => {
                    const relatedProduct = serviceTypes
                      ?.find(st => st.id === formData.serviceTypeId)
                      ?.serviceTypeProducts
                      .find(stp => stp.productId === rp.productId)
                    return (
                      <p key={index} className="text-sm text-gray-600">
                        関連商品: {rp.amount.toFixed(1)}
                        {relatedProduct?.product?.capacityUnit}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid w-full gap-1.5">
              <Label htmlFor="date">施術日</Label>
              <Input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="note">メモ</Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="default"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isPending || !formData.serviceTypeId}
              >
                {isPending ? '登録中...' : '登録'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}