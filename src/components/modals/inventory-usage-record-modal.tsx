"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { calculateUsageAmounts } from "@/lib/usage-calculations";
import {
  fetchServiceTypes,
  fetchStoreProducts,
  recordUsage,
  fetchClimateData,
} from "@/lib/api-client";
import type {
  Product,
  ServiceType,
  NailLength,
  ProductType,
  CreateUsageRequest,
} from "@/types/api";
import { DialogDescription } from "@/components/ui/dialog";

interface InventoryUsageRecordModalProps {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const initialFormData: UsageFormData = {
  serviceTypeId: "",
  mainProduct: {
    productId: "",
    amount: 0,
    isCustom: false,
  },
  relatedProducts: [],
  nailLength: "MEDIUM",
  date: new Date().toISOString().split("T")[0],
  note: "",
};

interface UsageAmountInputProps {
  amount: number;
  defaultAmount: number;
  isCustom: boolean;
  maxAmount?: number;
  unit?: string | null;
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
          size="sm"
          onClick={resetToDefault}
          className="text-xs"
        >
          デフォルト
        </Button>
      )}
    </div>
  );
}

export default function InventoryUsageRecordModal({
  storeId,
  open,
  onOpenChange,
}: InventoryUsageRecordModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UsageFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ProductType | "ALL">("ALL");

  // データ取得
  const { data: products = [] } = useQuery({
    queryKey: ["products", storeId],
    queryFn: () => fetchStoreProducts(storeId),
    enabled: open,
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["serviceTypes", storeId],
    queryFn: () => fetchServiceTypes(storeId),
    enabled: open,
  });

  const { data: climateData } = useQuery({
    queryKey: ["climate"],
    queryFn: fetchClimateData,
    enabled: open,
  });

  // 商品のフィルタリング
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === "ALL" || product.type === selectedType;

    return matchesSearch && matchesType;
  });

  // 選択商品に応じたサービスタイプの取得
  const getFilteredServiceTypes = (product: Product) => {
    if (["GEL_BASE", "GEL_TOP", "GEL_COLOR"].includes(product.type)) {
      return serviceTypes.filter((st) => st.name === "ワンカラー（ジェル）");
    }

    if (product.type === "POLISH") {
      return serviceTypes.filter(
        (st) => st.name === "ワンカラー（ポリッシュ）"
      );
    }

    return serviceTypes;
  };

  // 商品選択時の処理
  const handleProductSelect = (product: Product) => {
    const filteredTypes = getFilteredServiceTypes(product);
    const defaultServiceType = filteredTypes[0];

    if (defaultServiceType) {
      const calculations = calculateUsageAmounts(
        defaultServiceType,
        formData.nailLength
      );

      setFormData((prev) => ({
        ...prev,
        serviceTypeId: defaultServiceType.id,
        mainProduct: {
          productId: product.id,
          amount: calculations.mainAmount,
          defaultAmount: calculations.defaultAmount,
          isCustom: false,
        },
        relatedProducts: calculations.relatedAmounts.map((ra) => ({
          productId: ra.productId,
          amount: ra.amount,
          defaultAmount: ra.defaultAmount,
          isCustom: false,
        })),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        mainProduct: {
          productId: product.id,
          amount: 0,
          isCustom: false,
        },
        relatedProducts: [],
      }));
    }
  };

  // 爪の長さ変更時の処理
  const handleNailLengthChange = (nailLength: NailLength) => {
    const serviceType = serviceTypes.find(
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
      relatedProducts: calculations.relatedAmounts.map((ra) => ({
        productId: ra.productId,
        amount: prev.relatedProducts.find((rp) => rp.productId === ra.productId)
          ?.isCustom
          ? prev.relatedProducts.find((rp) => rp.productId === ra.productId)
              ?.amount ?? ra.amount
          : ra.amount,
        defaultAmount: ra.defaultAmount,
        isCustom:
          prev.relatedProducts.find((rp) => rp.productId === ra.productId)
            ?.isCustom ?? false,
      })),
    }));
  };

  // 使用記録の登録
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-white text-gray-800">
        <DialogHeader>
          <DialogTitle>使用記録の登録</DialogTitle>
          <DialogDescription>
            使用する商品を選択し、使用量を記録してください。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 商品タイプフィルター */}
          <div className="space-y-2">
            <Label>商品タイプ</Label>
            <Select
              value={selectedType}
              onValueChange={(value: ProductType | "ALL") =>
                setSelectedType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全て</SelectItem>
                <SelectItem value="POLISH">ポリッシュ</SelectItem>
                <SelectItem value="GEL_COLOR">ジェルカラー</SelectItem>
                <SelectItem value="GEL_BASE">ベースジェル</SelectItem>
                <SelectItem value="GEL_TOP">トップジェル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 商品検索 */}
          <div className="space-y-2">
            <Label>商品検索</Label>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="商品名またはブランド名で検索"
              className="bg-white"
            />
          </div>

          {/* 商品リスト */}
          <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                  formData.mainProduct.productId === product.id
                    ? "bg-gray-100"
                    : ""
                }`}
              >
                <div className="font-medium">{product.productName}</div>
                <div className="text-sm text-gray-600">{product.brand}</div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center text-gray-500 py-2">
                商品が見つかりません
              </div>
            )}
          </div>

          {formData.mainProduct.productId && (
            <>
              {/* 爪の長さ選択 */}
              <div className="space-y-2">
                <Label>爪の長さ</Label>
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

              {/* 使用量情報 */}
              {formData.serviceTypeId && (
                <div className="space-y-4 border rounded-md p-4 bg-gray-50">
                  <h4 className="font-medium">使用量</h4>

                  {/* メイン商品の使用量 */}
                  <div className="space-y-2">
                    <Label>
                      {
                        products.find(
                          (p) => p.id === formData.mainProduct.productId
                        )?.productName
                      }
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
                      maxAmount={
                        products.find(
                          (p) => p.id === formData.mainProduct.productId
                        )?.capacity ?? undefined
                      }
                      unit={
                        products.find(
                          (p) => p.id === formData.mainProduct.productId
                        )?.capacityUnit
                      }
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
                    const product = products.find((p) => p.id === rp.productId);
                    if (!product) return null;

                    return (
                      <div key={rp.productId} className="space-y-2">
                        <Label>
                          {product.productName}
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
                          maxAmount={product.capacity ?? undefined}
                          unit={product.capacityUnit ?? undefined} // null の場合は undefined に変換
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
                <div className="space-y-2 border rounded-md p-3 bg-blue-50">
                  <h4 className="font-medium">環境データ</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">気温</p>
                      <p className="font-medium">{climateData.temperature}℃</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">湿度</p>
                      <p className="font-medium">{climateData.humidity}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 日付入力 */}
              <div className="space-y-2">
                <Label>施術日</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  required
                  className="bg-white"
                />
              </div>

              {/* メモ入力 */}
              <div className="space-y-2">
                <Label>メモ</Label>
                <Input
                  value={formData.note}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="bg-white"
                />
              </div>
            </>
          )}

          {/* 送信ボタン */}
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
              disabled={!formData.mainProduct.productId || isPending}
            >
              {isPending ? "登録中..." : "登録"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
