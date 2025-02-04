'use client'

import { useState, useCallback, useEffect } from 'react'
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
  selectedProduct?: Product
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
  selectedProduct,
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
    queryFn: async () => {
      const data = await fetchServiceTypes(storeId);
      console.log('Fetched Service Types:', data);
      return data;
    },
    enabled: open,
  })

  // 商品の取得
  const { 
    data: products,
    error: productsError,
    isLoading: isLoadingProducts 
  } = useQuery<Product[]>({
    queryKey: ['products', storeId],
    queryFn: () => fetchStoreProducts(storeId),
    enabled: open,
  })

  // フィルタリング関数
  const getFilteredServiceTypes = useCallback(() => {
    if (!serviceTypes?.length || !selectedProduct) {
      console.log('No service types or selected product', { 
        hasServiceTypes: !!serviceTypes?.length,
        selectedProduct 
      });
      return [];
    }
  
    console.group('Service Types Filtering Debug');
    console.log('All Service Types:', serviceTypes.map(t => ({
      id: t.id,
      name: t.name,
      productType: t.productType,
      isGelService: t.isGelService
    })));
    console.log('Selected Product:', {
      name: selectedProduct.productName,
      type: selectedProduct.type,
      id: selectedProduct.id
    });
  
    const filtered = serviceTypes.filter(serviceType => {
      // 商品タイプがGEL系の場合
      if (["GEL_BASE", "GEL_TOP", "GEL_COLOR"].includes(selectedProduct.type)) {
        // isGelServiceがtrueのサービスタイプのみを許可
        return serviceType.isGelService;
      }
  
      // POLISHの場合
      if (selectedProduct.type === "POLISH") {
        return !serviceType.isGelService;
      }
  
      return false;
    });
  
    console.log('Filtered Results:', filtered.map(t => ({
      name: t.name,
      isGelService: t.isGelService
    })));
    console.groupEnd();
  
    return filtered;
  }, [serviceTypes, selectedProduct]);

  // サービスタイプ選択時の処理
  const handleServiceTypeChange = useCallback((serviceTypeId: string) => {
    const serviceType = serviceTypes?.find((type) => type.id === serviceTypeId);
    if (!serviceType || !selectedProduct) return;

    console.log('Service Type Selected:', {
      name: serviceType.name,
      isGelService: serviceType.isGelService,
      defaultAmount: serviceType.defaultUsageAmount,
      serviceTypeProducts: serviceType.serviceTypeProducts
    });

    // メイン商品の使用量を設定
    const mainAmount = serviceType.defaultUsageAmount;

    // 関連商品の設定
    const relatedProducts = serviceType.serviceTypeProducts
      .filter(stp => stp.isRequired && stp.productId !== selectedProduct.id)
      .sort((a, b) => a.order - b.order)
      .map(stp => ({
        productId: stp.productId,
        amount: stp.usageAmount
      }));

    console.log('Setting related products:', relatedProducts);

    setFormData(prev => ({
      ...prev,
      serviceTypeId,
      mainProduct: {
        ...prev.mainProduct,
        amount: mainAmount
      },
      relatedProducts
    }));
  }, [serviceTypes, selectedProduct]);

  // 爪の長さによる使用量の調整
  const handleNailLengthChange = useCallback((nailLength: NailLength) => {
    const serviceType = serviceTypes?.find(
      type => type.id === formData.serviceTypeId
    );
    if (!serviceType) return;

    const getLengthRate = (length: NailLength): number => {
      switch (length) {
        case 'SHORT': return serviceType.shortLengthRate;
        case 'MEDIUM': return serviceType.mediumLengthRate;
        case 'LONG': return serviceType.longLengthRate;
      }
    };

    const rate = getLengthRate(nailLength) / 100;
    const mainAmount = serviceType.defaultUsageAmount * rate;

    const relatedProducts = formData.relatedProducts.map(rp => {
      const stp = serviceType.serviceTypeProducts.find(
        stp => stp.productId === rp.productId
      );
      return {
        ...rp,
        amount: stp ? stp.usageAmount * rate : rp.amount,
      };
    });

    setFormData(prev => ({
      ...prev,
      nailLength,
      mainProduct: {
        ...prev.mainProduct,
        amount: mainAmount
      },
      relatedProducts,
    }));
  }, [formData.serviceTypeId, formData.relatedProducts, serviceTypes]);

  // モーダルが開かれたときの初期化処理
  // useEffect前のデバッグログ追加
console.log('Modal Props:', {
  isOpen: open,
  hasProduct: !!selectedProduct,
  productType: selectedProduct?.type
});

useEffect(() => {
  if (!open) {
    // モーダルが閉じられた時は初期状態にリセット
    setFormData(initialFormData);
    return;
  }

  console.log('Effect triggered:', {
    hasProduct: !!selectedProduct,
    productType: selectedProduct?.type,
    serviceTypesCount: serviceTypes?.length
  });

  if (selectedProduct) {
    const filtered = getFilteredServiceTypes();
    console.log('Available service types:', filtered.map(t => t.name));

    if (filtered.length === 1) {
      setFormData({
        ...initialFormData,
        serviceTypeId: filtered[0].id,
        mainProduct: {
          productId: selectedProduct.id,
          amount: filtered[0].defaultUsageAmount
        }
      });
    } else {
      setFormData({
        ...initialFormData,
        mainProduct: {
          productId: selectedProduct.id,
          amount: 0
        }
      });
    }
  }
}, [open, selectedProduct, serviceTypes, getFilteredServiceTypes]);

  // 使用記録の登録
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
      console.error('Usage record error:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '使用記録の登録に失敗しました。',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitUsage(formData);
  };

  // ローディング状態の表示
  if (isLoadingServiceTypes || isLoadingProducts) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>使用記録</DialogTitle>
            <DialogDescription>
              データを読み込んでいます...
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-40 flex items-center justify-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // エラー状態の表示
  if (serviceTypesError || productsError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>使用記録</DialogTitle>
            <DialogDescription>
              エラーが発生しました
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              データの取得に失敗しました。再度お試しください。
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const availableServiceTypes = getFilteredServiceTypes();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] bg-white overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white py-2 z-10 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            使用記録
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {selectedProduct ? 
              `${selectedProduct.brand} ${selectedProduct.productName}の使用記録を入力してください。` :
              '施術での商品使用記録を入力してください。'
            }
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
                disabled={availableServiceTypes.length === 1}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                  <SelectValue placeholder="施術タイプを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-800">
                  {availableServiceTypes.length === 0 ? (
                    <SelectItem value="no-options" disabled>
                      選択可能な施術タイプがありません
                    </SelectItem>
                  ) : (
                    availableServiceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="nailLength" className="text-gray-700">
                爪の長さ
              </Label>
              <Select
                value={formData.nailLength}
                onValueChange={handleNailLengthChange}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                  <SelectValue placeholder="爪の長さを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-800">
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

            {/* 使用量の表示 */}
            {formData.serviceTypeId && (
              <div className="space-y-2 border rounded-md p-3 bg-gray-50">
                <h4 className="font-medium text-gray-700">使用量</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    メイン商品: {formData.mainProduct.amount.toFixed(1)}
                    {selectedProduct?.capacityUnit}
                  </p>
                  {formData.relatedProducts.map((rp, index) => {
                    const product = products?.find(p => p.id === rp.productId);
                    return (
                      <p key={index} className="text-sm text-gray-600">
                        {product?.productName}: {rp.amount.toFixed(1)}
                        {product?.capacityUnit}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

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
              disabled={isPending || !formData.serviceTypeId}
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