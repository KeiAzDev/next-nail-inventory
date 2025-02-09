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

  const {
    data: serviceTypes,
    error: serviceTypesError,
    isLoading: isLoadingServiceTypes,
  } = useQuery<ServiceType[]>({
    queryKey: ["serviceTypes", storeId],
    queryFn: () => fetchServiceTypes(storeId),
    enabled: open,
  });

  const { data: climateData } = useQuery({
    queryKey: ["climate"],
    queryFn: async (context) => {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      return fetchClimateData(
        position.coords.latitude,
        position.coords.longitude
      );
    },
    enabled: open,
    retry: false
});

  const getFilteredServiceTypes = useCallback(
    (serviceTypes: ServiceType[]) => {
      if (["GEL_BASE", "GEL_TOP", "GEL_COLOR"].includes(product.type)) {
        return serviceTypes.filter((st) => st.name === "ワンカラー（ジェル）");
      }

      if (product.type === "POLISH") {
        return serviceTypes.filter(
          (st) => st.name === "ワンカラー（ポリッシュ）"
        );
      }

      return [];
    },
    [product.type]
  );

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
      (type) => type.id === formData.serviceTypeId
    );
    if (!serviceType) return;

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
  };

  const handleServiceTypeChange = (serviceTypeId: string) => {
    const serviceType = serviceTypes?.find((type) => type.id === serviceTypeId);
    if (!serviceType) return;

    const calculations = calculateUsageAmounts(
      serviceType,
      formData.nailLength
    );

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitUsage({
      ...formData,
      temperature: climateData?.temperature,
      humidity: climateData?.humidity,
      designVariant: serviceTypes?.find(
        (st) => st.id === formData.serviceTypeId
      )?.designVariant,
    });
  };

  const filteredServiceTypes = serviceTypes
    ? getFilteredServiceTypes(serviceTypes)
    : [];
  const selectedServiceType =
    filteredServiceTypes.length === 1 ? filteredServiceTypes[0] : null;

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
                {selectedServiceType?.name || "施術タイプが見つかりません"}
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

            {/* 使用量入力セクション */}
            {formData.serviceTypeId && (
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
                    amount={formData.mainProduct.amount}
                    defaultAmount={formData.mainProduct.defaultAmount ?? 0}
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
                disabled={isPending || !formData.serviceTypeId}
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
