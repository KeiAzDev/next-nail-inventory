// src/components/modals/service-type-modal.tsx
"use client";

import { useState } from "react";
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
import type { ProductType, Product } from "@/types/api";

interface ServiceTypeProduct {
  productId: string
  usageAmount: number
  isRequired: boolean
}

interface ServiceTypeFormData {
  name: string
  defaultUsageAmount: number
  productType: ProductType
  shortLengthRate: number
  mediumLengthRate: number
  longLengthRate: number
  allowCustomAmount: boolean
  products: ServiceTypeProduct[]
}

interface ServiceTypeModalProps {
  storeId: string
  open: boolean
  products: Product[]
  onOpenChange: (open: boolean) => void
}

const initialFormData: ServiceTypeFormData = {
  name: "",
  defaultUsageAmount: 1.0,
  productType: "POLISH",
  shortLengthRate: 80,
  mediumLengthRate: 100,
  longLengthRate: 130,
  allowCustomAmount: false,
  products: []
}

export default function ServiceTypeModal({
  storeId,
  open,
  products,
  onOpenChange,
}: ServiceTypeModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/stores/${storeId}/service-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create service type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceTypes", storeId] });
      onOpenChange(false);
      setFormData(initialFormData);
      toast({
        title: "施術タイプを登録しました",
        description: "施術タイプの登録が完了しました。",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "施術タイプの登録に失敗しました。",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData);
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          productId,
          usageAmount: product.averageUsePerService || 1.0,
          isRequired: true,
        },
      ],
    }));
  };

  const filteredProducts = products.filter(
    (product) => product.type === formData.productType
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] bg-white overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white py-2 z-10 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            施術タイプ登録
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            新しい施術タイプの情報を入力してください。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-1 pb-4">
          <div className="space-y-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="name" className="text-gray-700">
                施術タイプ名
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="border-gray-200"
                required
              />
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="productType" className="text-gray-700">
                商品タイプ
              </Label>
              <Select
                value={formData.productType}
                onValueChange={(value: ProductType) =>
                  setFormData((prev) => ({ ...prev, productType: value }))
                }
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                  <SelectValue placeholder="商品タイプを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="POLISH">ポリッシュ</SelectItem>
                  <SelectItem value="GEL_COLOR">ジェルカラー</SelectItem>
                  <SelectItem value="GEL_BASE">ジェルベース</SelectItem>
                  <SelectItem value="GEL_TOP">ジェルトップ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="defaultUsageAmount" className="text-gray-700">
                デフォルト使用量
              </Label>
              <Input
                id="defaultUsageAmount"
                type="number"
                step="0.1"
                min="0"
                value={formData.defaultUsageAmount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    defaultUsageAmount: Number(e.target.value),
                  }))
                }
                className="border-gray-200"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="shortLengthRate" className="text-gray-700">
                  ショート調整率
                </Label>
                <Input
                  id="shortLengthRate"
                  type="number"
                  min="1"
                  max="200"
                  value={formData.shortLengthRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shortLengthRate: Number(e.target.value),
                    }))
                  }
                  className="border-gray-200"
                  required
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="mediumLengthRate" className="text-gray-700">
                  ミディアム調整率
                </Label>
                <Input
                  id="mediumLengthRate"
                  type="number"
                  min="1"
                  max="200"
                  value={formData.mediumLengthRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mediumLengthRate: Number(e.target.value),
                    }))
                  }
                  className="border-gray-200"
                  required
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="longLengthRate" className="text-gray-700">
                  ロング調整率
                </Label>
                <Input
                  id="longLengthRate"
                  type="number"
                  min="1"
                  max="200"
                  value={formData.longLengthRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      longLengthRate: Number(e.target.value),
                    }))
                  }
                  className="border-gray-200"
                  required
                />
              </div>
            </div>

            <div className="grid w-full gap-1.5">
              <Label className="text-gray-700">関連商品</Label>
              <Select value="" onValueChange={handleProductSelect}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                  <SelectValue placeholder="商品を選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.brand} - {product.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-2">
                {formData.products.map((product, index) => {
                  const productData = products.find(
                    (p) => p.id === product.productId
                  );
                  return (
                    <div
                      key={product.productId}
                      className="flex items-center gap-2"
                    >
                      <span className="flex-1">{productData?.productName}</span>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={product.usageAmount}
                        onChange={(e) => {
                          const newProducts = [...formData.products];
                          newProducts[index].usageAmount = Number(
                            e.target.value
                          );
                          setFormData((prev) => ({
                            ...prev,
                            products: newProducts,
                          }));
                        }}
                        className="w-20 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newProducts = formData.products.filter(
                            (_, i) => i !== index
                          );
                          setFormData((prev) => ({
                            ...prev,
                            products: newProducts,
                          }));
                        }}
                      >
                        削除
                      </Button>
                    </div>
                  );
                })}
              </div>
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
              {isPending ? "登録中..." : "登録"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
