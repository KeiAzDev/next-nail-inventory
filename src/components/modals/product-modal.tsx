"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "@/components/ui/use-toast";
import { ColorPicker } from "@/components/ui/color-picker"
import type { ProductType } from "@/types/api";
import { productTypeLabels, isLiquidProduct, needsColorPicker } from "@/types/api";

interface AddProductModalProps {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductFormData {
  brand: string;
  productName: string;
  colorCode: string;
  colorName: string;
  type: ProductType;
  price: number;
  quantity: number;
  capacity?: number;
  capacityUnit?: string;
  averageUsePerService?: number;
  minStockAlert: number;
  recommendedAlertPercentage: number;
  // 新しいフィールド
  isLiquid: boolean;
  useColorPicker: boolean;
}

// 商品タイプごとのデフォルトカラー
const defaultColors: Record<ProductType, string> = {
  POLISH_COLOR: "rgba(0, 0, 0, 1)",
  GEL_COLOR: "rgba(0, 0, 0, 1)",
  POLISH_BASE: "rgba(255, 255, 255, 0.5)",
  POLISH_TOP: "rgba(255, 255, 255, 0.7)",
  GEL_BASE: "rgba(255, 255, 255, 0.5)",
  GEL_TOP: "rgba(255, 255, 255, 0.7)",
  GEL_REMOVER: "rgba(255, 255, 255, 0.2)",
  NAIL_CARE: "rgba(200, 200, 200, 1)",
  TOOL: "rgba(150, 150, 150, 1)",
  CONSUMABLE: "rgba(180, 180, 180, 1)",
  SANITIZATION: "rgba(200, 230, 255, 1)",
  STORE_SUPPLY: "rgba(230, 230, 230, 1)",
};

const initialFormData: ProductFormData = {
  brand: "",
  productName: "",
  colorCode: defaultColors.POLISH_COLOR,
  colorName: "",
  type: "POLISH_COLOR",
  price: 0,
  quantity: 1,
  minStockAlert: 5,
  recommendedAlertPercentage: 20,
  capacity: undefined,
  capacityUnit: undefined,
  averageUsePerService: undefined,
  isLiquid: true,
  useColorPicker: true,
};

// 製品タイプをカテゴリーでグループ化
const productTypeGroups = {
  "ポリッシュ関連": ["POLISH_COLOR", "POLISH_BASE", "POLISH_TOP"],
  "ジェル関連": ["GEL_COLOR", "GEL_BASE", "GEL_TOP", "GEL_REMOVER"],
  "その他商品": ["NAIL_CARE", "TOOL", "CONSUMABLE", "SANITIZATION", "STORE_SUPPLY"]
} as const;

export default function AddProductModal({
  storeId,
  open,
  onOpenChange,
}: AddProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const queryClient = useQueryClient();

  // モーダルが開かれたときにフォームをリセット
  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
    }
  }, [open]);

  // タイプが変更されたときのデフォルト設定
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      colorCode: defaultColors[prev.type],
      isLiquid: isLiquidProduct(prev.type),
      useColorPicker: needsColorPicker(prev.type)
    }));
  }, [formData.type]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await fetch(`/api/stores/${storeId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to register product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      onOpenChange(false);
      setFormData(initialFormData);
      toast({
        title: "商品を登録しました",
        description: "商品の登録が完了しました。",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "商品の登録に失敗しました。",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData);
  };

  // 全角数字を半角に変換する関数
  const convertFullWidthToHalfWidth = (value: string): string => {
    return value.replace(/[０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    });
  };

  // 数値として有効な文字列かチェックする関数（全角数字を含む）
  const isValidNumberInput = (value: string): boolean => {
    if (value === "") return true;
    const halfWidth = convertFullWidthToHalfWidth(value);
    return /^\d*$/.test(halfWidth);
  };

  // 数値の入力を処理する関数
  const handleNumberInput = (
    value: string,
    defaultValue: number = 0
  ): number => {
    if (value === "") return defaultValue;
    const halfWidth = convertFullWidthToHalfWidth(value);
    return Number(halfWidth);
  };

  // 小数点以下の数値入力を処理する関数
  const handleDecimalInput = (value: string): boolean => {
    return /^\d*\.?\d*$/.test(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] bg-white overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white py-2 z-10 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900">商品登録</DialogTitle>
          <DialogDescription className="text-gray-600">
            新しい商品の情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-1 pb-4">
          <div className="space-y-4 sm:space-y-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="brand" className="text-gray-700">
                ブランド名
              </Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, brand: e.target.value }))
                }
                className="border-gray-200"
                required
              />
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="productName" className="text-gray-700">
                商品名
              </Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    productName: e.target.value,
                  }))
                }
                className="border-gray-200"
                required
              />
            </div>
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="type" className="text-gray-700">
              種類
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: ProductType) =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                <SelectValue placeholder="種類を選択" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 text-gray-800">
                {Object.entries(productTypeGroups).map(([groupName, types]) => (
                  <div key={groupName}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
                      {groupName}
                    </div>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {productTypeLabels[type as ProductType]}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.useColorPicker && (
            <div className="grid w-full gap-1.5">
              <Label htmlFor="color" className="text-gray-700">
                カラー設定
              </Label>
              <ColorPicker
                value={formData.colorCode}
                onChange={(color) =>
                  setFormData((prev) => ({
                    ...prev,
                    colorCode: color,
                  }))
                }
                showOpacity={['POLISH_BASE', 'POLISH_TOP', 'GEL_BASE', 'GEL_TOP', 'GEL_REMOVER'].includes(formData.type)}
              />
              <Input
                id="colorName"
                placeholder="カラー名"
                value={formData.colorName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    colorName: e.target.value,
                  }))
                }
                className="mt-2 border-gray-200"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="price" className="text-gray-700">
                価格
              </Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidNumberInput(value)) {
                    setFormData((prev) => ({
                      ...prev,
                      price: handleNumberInput(value, 0),
                    }));
                  }
                }}
                onBlur={(e) => {
                  const value = convertFullWidthToHalfWidth(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    price: handleNumberInput(value, 0),
                  }));
                }}
                className="border-gray-200"
                required
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="quantity" className="text-gray-700">
                数量
              </Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                value={formData.quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*$/.test(value)) {
                    setFormData((prev) => ({
                      ...prev,
                      quantity: value === "" ? 1 : Number(value),
                    }));
                  }
                }}
                className="border-gray-200"
                required
              />
            </div>
          </div>

          {formData.isLiquid && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="capacity" className="text-gray-700">
                    容量
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    step="0.1"
                    value={formData.capacity ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (handleDecimalInput(value)) {
                        setFormData((prev) => ({
                          ...prev,
                          capacity: value === "" ? undefined : Number(value),
                        }));
                      }
                    }}
                    className="border-gray-200"
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="capacityUnit" className="text-gray-700">
                    単位
                  </Label>
                  <Select
                    value={formData.capacityUnit ?? ""}
                    onValueChange={(value: string) =>
                      setFormData((prev) => ({ ...prev, capacityUnit: value }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                      <SelectValue placeholder="単位を選択" />
                    </SelectTrigger>
                    <SelectContent className="text-gray-800">
                      <SelectItem value="ml">ml（ミリリットル）</SelectItem>
                      <SelectItem value="g">g（グラム）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="averageUsePerService" className="text-gray-700">
                  1回の施術での平均使用量
                </Label>
                <Input
                  id="averageUsePerService"
                  type="number"
                  step="0.1"
                  value={formData.averageUsePerService ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (handleDecimalInput(value)) {
                      setFormData((prev) => ({
                        ...prev,
                        averageUsePerService:
                          value === "" ? undefined : Number(value),
                      }));
                    }
                  }}
                  className="border-gray-200"
                />
              </div>
            </>
          )}

          <div className="grid w-full gap-1.5">
            <Label htmlFor="minStockAlert" className="text-gray-700">
              アラート在庫数
            </Label>
            <Input
              id="minStockAlert"
              type="number"
              min="1"
              value={formData.minStockAlert}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  minStockAlert: Number(e.target.value),
                }))
              }
              className="border-gray-200"
              required
            />
          </div>

          <div className="grid w-full gap-1.5">
            <Label
              htmlFor="recommendedAlertPercentage"
              className="text-gray-700"
            >
              推奨アラート閾値（%）
            </Label>
            <Input
              id="recommendedAlertPercentage"
              type="number"
              min="1"
              max="100"
              value={formData.recommendedAlertPercentage}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 1 && value <= 100) {
                  setFormData((prev) => ({
                    ...prev,
                    recommendedAlertPercentage: value,
                  }));
                }
              }}
              className="border-gray-200"
              required
            />
          </div>

          <div className="sticky bottom-0 bg-white pt-4 mt-6 flex justify-end gap-2 border-t">
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
  );
}