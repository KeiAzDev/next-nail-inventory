//src/components/modals/product-usage-record-modal.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calculateUsageAmounts } from "@/lib/usage-calculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  NailLength,
  ServiceType,
  Product,
  CreateUsageRequest,
} from "@/types/api";
import {
  fetchServiceTypes,
  recordUsage,
  fetchClimateData,
} from "@/lib/api-client";

interface ProductUsageRecordModalProps {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

interface UsageFormData {
  serviceTypeId: string;
  mainProduct: {
    productId: string;
    amount: number;
    isCustom: boolean;
    defaultAmount?: number;
  };
  relatedProducts: {
    productId: string;
    amount: number;
    isCustom: boolean;
    defaultAmount?: number;
  }[];
  nailLength: NailLength;
  date: string;
  note?: string;
  adjustmentReason?: string;
}

const initialFormData = (productId: string): UsageFormData => ({
  serviceTypeId: "",
  mainProduct: {
    productId,
    amount: 0,
    isCustom: false,
  },
  relatedProducts: [],
  nailLength: "MEDIUM",
  date: new Date().toISOString().split("T")[0],
  note: "",
});

interface UsageAmountInputProps {
  amount: number;
  defaultAmount: number;
  isCustom: boolean;
  maxAmount?: number;
  unit?: string;
  onAmountChange: (amount: number, isCustom: boolean) => void;
}

// 型安全なタイプチェック関数
function isGelType(type: string): boolean {
  return ["GEL_BASE", "GEL_TOP", "GEL_COLOR", "GEL_REMOVER"].includes(type);
}

function isPolishType(type: string): boolean {
  return type === "POLISH_COLOR" || type === "POLISH" || 
         type === "POLISH_BASE" || type === "POLISH_TOP";
}

function UsageAmountInput({
  amount,
  defaultAmount,
  isCustom,
  maxAmount,
  unit,
  onAmountChange,
}: UsageAmountInputProps) {
  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (
      isNaN(numValue) ||
      numValue < 0 ||
      (maxAmount && numValue > maxAmount)
    ) {
      return;
    }
    onAmountChange(numValue, true);
  };

  const resetToDefault = () => {
    onAmountChange(defaultAmount, false);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={amount}
        onChange={(e) => handleAmountChange(e.target.value)}
        step={0.1}
        min={0}
        max={maxAmount}
        className={`bg-white ${isCustom ? "border-blue-500" : ""}`}
      />
      <span className="text-sm text-gray-500">{unit}</span>
      {isCustom && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={resetToDefault}
          className="text-xs"
        >
          デフォルトに戻す
        </Button>
      )}
    </div>
  );
}

export default function ProductUsageRecordModal({
  storeId,
  open,
  onOpenChange,
  product,
}: ProductUsageRecordModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UsageFormData>(
    initialFormData(product.id)
  );
  const [noServiceTypesError, setNoServiceTypesError] = useState(false);

  // デフォルトサービスタイプ設定 - 商品タイプに基づく
  const getDefaultServiceName = useCallback(() => {
    const productType = String(product.type);
    if (isGelType(productType)) {
      return "ワンカラー（ジェル）";
    }
    if (isPolishType(productType)) {
      return "ワンカラー（ポリッシュ）";
    }
    return null;
  }, [product.type]);

  // サービスタイプ作成関数
  const createDefaultServiceTypes = useCallback(async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/service-types/create-defaults`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('デフォルトサービスタイプの作成に失敗しました');
      }
      
      const data = await response.json();
      console.log('Created service types:', data);
      
      // サービスタイプのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["serviceTypes", storeId] });
      return data;
    } catch (error) {
      console.error('Error creating default service types:', error);
      throw error;
    }
  }, [storeId, queryClient]);

  const {
    data: serviceTypes,
    error: serviceTypesError,
    isLoading: isLoadingServiceTypes,
    refetch: refetchServiceTypes
  } = useQuery<ServiceType[]>({
    queryKey: ["serviceTypes", storeId],
    queryFn: async () => {
      console.log("Fetching service types for store:", storeId);
      const result = await fetchServiceTypes(storeId);
      console.log("Fetched service types:", result);
      return result;
    },
    enabled: open,
    staleTime: 1000 * 60 * 5, // 5分
    gcTime: 1000 * 60 * 30,   // 30分
  });

  const { data: climateData } = useQuery({
    queryKey: ["climate"],
    queryFn: async (context) => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        return fetchClimateData(
          position.coords.latitude,
          position.coords.longitude
        );
      } catch (error) {
        console.error("Failed to get location:", error);
        return null;
      }
    },
    enabled: open,
    retry: false
  });

  const getFilteredServiceTypes = useCallback(
    (serviceTypes: ServiceType[]) => {
      // 安全に文字列として扱う
      const productType = String(product.type);
      console.log("Product details:", {
        name: product.productName,
        type: productType,
        brand: product.brand,
        id: product.id
      });
      console.log("Available service types:", serviceTypes?.length || 0, "types available");
      
      // サービスタイプがない場合
      if (!serviceTypes || serviceTypes.length === 0) {
        console.warn("No service types available");
        return [];
      }

      // デフォルトサービスタイプ名の取得
      const defaultServiceName = getDefaultServiceName();
      if (defaultServiceName) {
        // 名前で検索
        const defaultType = serviceTypes.find(st => st.name === defaultServiceName);
        if (defaultType) {
          console.log(`Found default service type: ${defaultServiceName}`);
          return [defaultType];
        }
      }
      
      // ジェル系商品の場合
      if (isGelType(productType)) {
        const gelTypes = serviceTypes.filter((st) => 
          st.isGelService === true || 
          st.name.includes("ジェル") || 
          st.name === "ワンカラー（ジェル）" ||
          isGelType(String(st.productType))
        );
        
        if (gelTypes.length > 0) {
          console.log("Filtered gel service types:", gelTypes.map(st => st.name));
          return gelTypes;
        }
      }

      // ポリッシュ系商品の場合
      if (isPolishType(productType)) {
        const polishTypes = serviceTypes.filter((st) => 
          st.isGelService === false ||
          st.name.includes("ポリッシュ") || 
          st.name === "ワンカラー（ポリッシュ）" ||
          isPolishType(String(st.productType))
        );
        
        if (polishTypes.length > 0) {
          console.log("Filtered polish service types:", polishTypes.map(st => st.name));
          return polishTypes;
        }
      }

      // 追加のフォールバックロジック - 商品名やブランドから推測
      if (product.productName.toLowerCase().includes("ジェル") || 
          product.brand.toLowerCase().includes("ジェル")) {
        console.log("Using name-based fallback for gel product");
        const gelNameTypes = serviceTypes.filter(st => 
          st.name.includes("ジェル") || 
          isGelType(String(st.productType))
        );
        
        if (gelNameTypes.length > 0) {
          return gelNameTypes;
        }
      }
      
      if (product.productName.toLowerCase().includes("ポリッシュ") || 
          product.brand.toLowerCase().includes("ポリッシュ")) {
        console.log("Using name-based fallback for polish product");
        const polishNameTypes = serviceTypes.filter(st => 
          st.name.includes("ポリッシュ") || 
          isPolishType(String(st.productType))
        );
        
        if (polishNameTypes.length > 0) {
          return polishNameTypes;
        }
      }

      // カラー系商品の場合、カラー系のサービスタイプを優先
      if (product.colorName && product.colorCode) {
        console.log("Product is a color product, looking for color service types");
        const colorTypes = serviceTypes.filter(st => 
          st.name.includes("カラー") || 
          ["GEL_COLOR", "POLISH_COLOR"].includes(String(st.productType))
        );
        if (colorTypes.length > 0) {
          console.log("Found color service types:", colorTypes.map(st => st.name));
          return colorTypes;
        }
      }

      console.log("No specific matching service types found, returning all service types");
      // 最後のフォールバック - すべての施術タイプを返す
      return serviceTypes;
    },
    [product, getDefaultServiceName]
  );

  const handleServiceTypeChange = useCallback((serviceTypeId: string) => {
    console.log("Selected service type ID:", serviceTypeId);
    const serviceType = serviceTypes?.find((type) => type.id === serviceTypeId);
    if (!serviceType) {
      console.warn("Service type not found for ID:", serviceTypeId);
      return;
    }

    try {
      const calculations = calculateUsageAmounts(
        serviceType,
        formData.nailLength
      );
      console.log("Calculated usage amounts:", calculations);

      setFormData((prev) => ({
        ...prev,
        serviceTypeId,
        mainProduct: {
          productId: prev.mainProduct.productId,
          amount: calculations.mainAmount,
          defaultAmount: calculations.defaultAmount,
          isCustom: false,
        },
        relatedProducts: calculations.relatedAmounts
          .filter((ra) => ra.productId !== product.id)
          .map((ra) => ({
            productId: ra.productId,
            amount: ra.amount,
            defaultAmount: ra.defaultAmount,
            isCustom: false,
          })),
      }));
    } catch (error) {
      console.error("Error calculating usage amounts:", error);
      toast({
        title: "計算エラー",
        description: "使用量の計算に失敗しました。管理者に連絡してください。",
        variant: "destructive"
      });
      
      // エラー時も基本的な設定を行う
      setFormData((prev) => ({
        ...prev,
        serviceTypeId,
        mainProduct: {
          ...prev.mainProduct,
          amount: 1.0, // デフォルト値
          isCustom: false,
        },
      }));
    }
  }, [formData.nailLength, product.id, serviceTypes, toast]);

  useEffect(() => {
    if (open && serviceTypes) {
      console.log("Product:", product.productName, "Type:", String(product.type));
      console.log("Service types loaded:", serviceTypes.length, "types available");
      
      if (serviceTypes.length === 0) {
        console.warn("No service types available at all");
        setNoServiceTypesError(true);
        return;
      } else {
        setNoServiceTypesError(false);
      }
      
      const filtered = getFilteredServiceTypes(serviceTypes);
      console.log("Filtered service types:", filtered.length, "types found");
      
      if (filtered.length >= 1) {
        // 完全一致するものを優先
        const exactMatch = filtered.find(st => String(st.productType) === String(product.type));
        if (exactMatch) {
          console.log("Found exact match service type:", exactMatch.name);
          handleServiceTypeChange(exactMatch.id);
        } else if (filtered.length > 0) {
          console.log("Using first available service type:", filtered[0].name);
          handleServiceTypeChange(filtered[0].id);
        }
      } else if (serviceTypes.length > 0) {
        // フィルタリングに失敗した場合でも最低一つ選択する
        console.warn("No filtered service types found for product:", product.productName);
        console.log("Using first available service type as fallback");
        handleServiceTypeChange(serviceTypes[0].id);
      }
    }
  }, [serviceTypes, open, getFilteredServiceTypes, product, handleServiceTypeChange]);

  const handleNailLengthChange = (nailLength: NailLength) => {
    const serviceType = serviceTypes?.find(
      (type) => type.id === formData.serviceTypeId
    );
    if (!serviceType) return;

    try {
      const calculations = calculateUsageAmounts(serviceType, nailLength);

      setFormData((prev) => ({
        ...prev,
        nailLength,
        mainProduct: {
          ...prev.mainProduct,
          amount: prev.mainProduct.isCustom
            ? prev.mainProduct.amount
            : calculations.mainAmount,
          defaultAmount: calculations.defaultAmount,
        },
        relatedProducts: calculations.relatedAmounts
          .filter((ra) => ra.productId !== product.id)
          .map((ra) => ({
            productId: ra.productId,
            amount: ra.amount,
            defaultAmount: ra.defaultAmount,
            isCustom: false,
          })),
      }));
    } catch (error) {
      console.error("Error calculating usage amounts:", error);
      toast({
        title: "計算エラー",
        description: "使用量の再計算に失敗しました。",
        variant: "destructive"
      });
    }
  };

  const { mutate: submitUsage, isPending } = useMutation({
    mutationFn: (data: CreateUsageRequest) => recordUsage(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["usages", storeId] });
      onOpenChange(false);
      toast({
        title: "使用記録を登録しました",
        description: "使用記録の登録が完了しました。",
      });
    },
    onError: (error) => {
      console.error("Usage record error:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "使用記録の登録に失敗しました。",
      });
    },
  });

  const { mutate: createServiceTypes, isPending: isCreatingServiceTypes } = useMutation({
    mutationFn: createDefaultServiceTypes,
    onSuccess: () => {
      refetchServiceTypes();
      toast({
        title: "サービスタイプを作成しました",
        description: "デフォルトのサービスタイプを作成しました。",
      });
    },
    onError: (error) => {
      console.error("Service type creation error:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "サービスタイプの作成に失敗しました。",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting usage record:", formData);
    submitUsage({
      ...formData,
      temperature: climateData?.temperature,
      humidity: climateData?.humidity,
      designVariant: serviceTypes?.find(
        (st) => st.id === formData.serviceTypeId
      )?.designVariant,
    });
  };

  // フィルタリングされたサービスタイプ
  const filteredServiceTypes = serviceTypes
    ? getFilteredServiceTypes(serviceTypes)
    : [];
    
  // 表示用サービスタイプ（フィルタリングされたものがあればそれを使用、なければ全て）
  const displayServiceTypes = filteredServiceTypes.length > 0 
    ? filteredServiceTypes
    : serviceTypes || [];
    
  const selectedServiceType = serviceTypes?.find(
    (st) => st.id === formData.serviceTypeId
  );

  // サービスタイプがない場合のデフォルト使用量
  const defaultAmount = product.averageUsePerService || 1.0;

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
        ) : noServiceTypesError ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                施術タイプが設定されていません。サービスタイプを作成してください。
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => createServiceTypes()} 
              disabled={isCreatingServiceTypes}
              className="w-full"
            >
              {isCreatingServiceTypes ? "作成中..." : "デフォルト施術タイプを作成"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 施術タイプ選択 */}
            <div className="grid w-full gap-1.5">
              <Label htmlFor="serviceType">施術タイプ</Label>
              {displayServiceTypes.length > 0 ? (
                <Select
                  value={formData.serviceTypeId}
                  onValueChange={handleServiceTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="施術タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayServiceTypes.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 border rounded-md bg-gray-50 text-center text-gray-500">
                  施術タイプが利用できません
                </div>
              )}
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

            {/* 使用量入力セクション */}
            {(formData.serviceTypeId || displayServiceTypes.length === 0) && (
              <div className="space-y-4 border rounded-md p-4 bg-gray-50">
                <h4 className="font-medium">使用量</h4>

                {/* メイン商品の使用量 */}
                <div className="space-y-2">
                  <Label>
                    {product.productName}
                    {formData.mainProduct.isCustom && (
                      <span className="ml-2 text-sm text-blue-600">
                        カスタム
                      </span>
                    )}
                  </Label>
                  <UsageAmountInput
                    amount={formData.mainProduct.amount || defaultAmount}
                    defaultAmount={formData.mainProduct.defaultAmount ?? defaultAmount}
                    isCustom={formData.mainProduct.isCustom}
                    maxAmount={product.capacity ?? undefined}
                    unit={product.capacityUnit ?? undefined}
                    onAmountChange={(amount, isCustom) => {
                      setFormData((prev) => ({
                        ...prev,
                        mainProduct: {
                          ...prev.mainProduct,
                          amount,
                          isCustom,
                        },
                      }));
                    }}
                  />
                </div>

                {/* 関連商品の使用量 */}
                {formData.relatedProducts.map((rp, index) => {
                  const relatedProduct = serviceTypes
                    ?.find((st) => st.id === formData.serviceTypeId)
                    ?.serviceTypeProducts.find(
                      (stp) => stp.productId === rp.productId
                    )?.product;

                  if (!relatedProduct) return null;

                  return (
                    <div key={rp.productId} className="space-y-2">
                      <Label>
                        {relatedProduct.productName}
                        {rp.isCustom && (
                          <span className="ml-2 text-sm text-blue-600">
                            カスタム
                          </span>
                        )}
                      </Label>
                      <UsageAmountInput
                        amount={rp.amount}
                        defaultAmount={rp.defaultAmount ?? 0}
                        isCustom={rp.isCustom}
                        maxAmount={relatedProduct.capacity ?? undefined}
                        unit={relatedProduct.capacityUnit ?? undefined}
                        onAmountChange={(amount, isCustom) => {
                          setFormData((prev) => ({
                            ...prev,
                            relatedProducts: prev.relatedProducts.map(
                              (item, i) =>
                                i === index
                                  ? { ...item, amount, isCustom }
                                  : item
                            ),
                          }));
                        }}
                      />
                    </div>
                  );
                })}

                {/* カスタム値の場合の調整理由入力 */}
                {(formData.mainProduct.isCustom ||
                  formData.relatedProducts.some((rp) => rp.isCustom)) && (
                  <div className="space-y-2">
                    <Label>調整理由</Label>
                    <Input
                      value={formData.adjustmentReason ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          adjustmentReason: e.target.value,
                        }))
                      }
                      placeholder="使用量を調整した理由を入力してください"
                      className="bg-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 気象データの表示 */}
            {climateData && (
              <div className="mt-6 space-y-2 border rounded-md p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-500">
                    参考データ
                  </h4>
                  <span className="text-xs text-gray-400">
                    施術環境の記録用
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">気温</p>
                    <p className="text-sm">{climateData.temperature}℃</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">湿度</p>
                    <p className="text-sm">{climateData.humidity}%</p>
                  </div>
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
                className="bg-white"
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
                className="bg-white"
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
                variant="default"
                disabled={isPending || (!formData.serviceTypeId && displayServiceTypes.length > 0)}
              >
                {isPending ? "登録中..." : "登録"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}