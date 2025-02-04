"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Package2, AlertTriangle } from "lucide-react";
import { fetchProductDetails } from "@/lib/api-client";
import type { Product } from "@/types/api";
import UsageRecordModal from "@/components/modals/usage-record-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ProductUsageRecordModal from "../modals/product-usage-record-modal";

interface StoreProductDetailProps {
  storeId: string;
  productId: string;
}

// 商品削除用の関数
async function deleteProduct(
  storeId: string,
  productId: string
): Promise<void> {
  const response = await fetch(`/api/stores/${storeId}/products/${productId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("商品の削除に失敗しました");
  }
}

export default function StoreProductDetail({
  storeId,
  productId,
}: StoreProductDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: product,
    error,
    isLoading,
  } = useQuery<Product>({
    queryKey: ["product", productId],
    queryFn: () => fetchProductDetails(storeId, productId),
  });

  // デバッグ情報の出力
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && product) {
      console.group("Product Detail Debug Info");
      console.log("Product:", {
        id: product.id,
        type: product.type,
        name: `${product.brand} ${product.productName}`,
      });
      console.groupEnd();
    }
  }, [product]);

  // 在庫状態の判定
  const getStockStatus = (product: Product) => {
    const inUseLot = product.lots?.find((lot) => lot.isInUse);
    const currentAmount = inUseLot?.currentAmount ?? 0;
    const hasStock = product.lotQuantity > 0;

    if (hasStock) {
      return {
        color: "text-green-600",
        bgColor: "bg-green-50",
        label: "在庫あり",
        description: `未使用: ${product.lotQuantity}個`,
        showAlert: false,
      };
    }

    if (currentAmount > 0) {
      const percentage = (currentAmount / (product.capacity ?? 1)) * 100;
      if (percentage > product.recommendedAlertPercentage) {
        return {
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          label: "使用中",
          description: `残量: ${currentAmount.toFixed(1)}${
            product.capacityUnit ?? ""
          }`,
          showAlert: false,
        };
      } else {
        return {
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          label: "残量わずか",
          description: `残量: ${currentAmount.toFixed(1)}${
            product.capacityUnit ?? ""
          }`,
          showAlert: true,
        };
      }
    }

    return {
      color: "text-red-600",
      bgColor: "bg-red-50",
      label: "在庫なし",
      description: "補充が必要です",
      showAlert: true,
    };
  };

  // 商品削除の処理
  const handleDelete = async () => {
    try {
      await deleteProduct(storeId, productId);
      toast({
        title: "商品を削除しました",
        variant: "default",
      });
      router.push(`/stores/${storeId}/inventory`);
    } catch (error) {
      toast({
        title: "商品の削除に失敗しました",
        description:
          error instanceof Error
            ? error.message
            : "予期せぬエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          商品情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    );
  }

  if (!product) {
    return (
      <Alert>
        <AlertDescription>商品が見つかりませんでした。</AlertDescription>
      </Alert>
    );
  }

  const status = getStockStatus(product);
  const currentLot = product.lots?.find((lot) => lot.isInUse);
  const unusedLots = product.lots?.filter((lot) => !lot.isInUse) ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              <CardTitle>商品詳細</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUsageModal(true)}
                className="bg-white hover:bg-gray-100"
              >
                使用記録
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                削除
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本情報 */}
          <div>
            <h3 className="text-lg font-medium mb-4">基本情報</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ブランド</p>
                <p className="font-medium">{product.brand}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">商品名</p>
                <p className="font-medium">{product.productName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">カラー</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: product.colorCode }}
                  />
                  <p className="font-medium">{product.colorName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">種類</p>
                <p className="font-medium">{product.type}</p>
              </div>
            </div>
          </div>

          {/* 在庫状態 */}
          <div>
            <h3 className="text-lg font-medium mb-4">在庫状態</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div
                      className={`px-3 py-1 rounded-full text-sm ${status.bgColor} ${status.color}`}
                    >
                      {status.label}
                    </div>
                    {status.showAlert && (
                      <AlertTriangle className={`h-5 w-5 ${status.color}`} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {status.description}
                    </p>
                    {product.averageUsesPerMonth && (
                      <p className="text-sm text-muted-foreground">
                        月平均使用: {product.averageUsesPerMonth}回
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        現在の在庫数
                      </p>
                      <p className="text-xl font-semibold">
                        {product.totalQuantity}個
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        未使用ロット
                      </p>
                      <p className="text-xl font-semibold">
                        {product.lotQuantity}個
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ロット情報 */}
          <div>
            <h3 className="text-lg font-medium mb-4">ロット管理</h3>
            <div className="space-y-4">
              {/* 使用中ロット */}
              {currentLot && (
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-medium mb-3">使用中のロット</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">開始日</p>
                        <p>
                          {new Date(currentLot.startedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          現在の残量
                        </p>
                        <p>
                          {currentLot.currentAmount}
                          {product.capacityUnit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">状態</p>
                        <p className="text-green-600">使用中</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 未使用ロット */}
              {unusedLots.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-medium mb-3">
                      未使用ロット {unusedLots.length}個
                    </h4>
                    <div className="space-y-3">
                      {unusedLots.map((lot) => (
                        <div
                          key={lot.id}
                          className="grid grid-cols-3 gap-4 py-2 border-b last:border-0"
                        >
                          <div>
                            <p className="text-sm text-muted-foreground">
                              登録日
                            </p>
                            <p>
                              {new Date(lot.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              容量
                            </p>
                            <p>
                              {product.capacity}
                              {product.capacityUnit}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              状態
                            </p>
                            <p className="text-blue-600">未使用</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProductUsageRecordModal
        open={showUsageModal}
        onOpenChange={setShowUsageModal}
        storeId={storeId}
        product={product}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品の削除</DialogTitle>
            <DialogDescription>
              この商品を削除してもよろしいですか？
              <br />
              関連する全てのデータ（使用記録、ロット情報など）が削除されます。
              <br />
              この操作は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
