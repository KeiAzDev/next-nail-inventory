//src/components/store/product-usage-statistics.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProductStatistics } from "@/hooks/queries/use-product-statistics";

interface ProductUsageStatisticsProps {
  storeId: string;
}

interface StatsCardProps {
  title: string;
  value: string;
  bgColor: string;
  textColor: string;
}

function StatsCard({ title, value, bgColor, textColor }: StatsCardProps) {
  return (
    <div className={`p-4 rounded-lg ${bgColor}`}>
      <h4 className={`font-semibold ${textColor}`}>{title}</h4>
      <p className="text-2xl font-medium">{value}</p>
    </div>
  );
}

export default function ProductUsageStatistics({
  storeId,
}: ProductUsageStatisticsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [year] = useState(new Date().getFullYear());
  const [month] = useState(new Date().getMonth() + 1);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useProductStatistics(storeId, {
    year,
    month,
    page: currentPage,
  });

  const filteredAndSortedStats = React.useMemo(() => {
    if (!data?.statistics) return [];

    return data.statistics
      .filter(stat => 
        searchQuery === "" ||
        stat.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stat.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stat.colorName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // 最新の使用日時で降順ソート
        const dateA = a.lastUsedAt ? new Date(a.lastUsedAt) : new Date(0);
        const dateB = b.lastUsedAt ? new Date(b.lastUsedAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [data?.statistics, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-72 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <Input
          placeholder="商品名、ブランド、カラー名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      {filteredAndSortedStats.map((stat) => (
        <Card key={stat.productId}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-medium">
                {stat.productName || "商品名なし"} (
                {stat.brand || "ブランド未設定"})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {stat.colorName} - {stat.type}
              </p>
            </div>
            <div className="text-sm">
              残量: {stat.remainingAmount.toFixed(1)}
              {stat.capacityUnit || "ml"}
            </div>
          </CardHeader>
          <CardContent>
            {/* 基本情報カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatsCard
                title="総使用量"
                value={`${stat.totalUsage.toFixed(1)}`}
                bgColor="bg-blue-50"
                textColor="text-blue-900"
              />
              <StatsCard
                title="使用回数"
                value={`${stat.usageCount}回`}
                bgColor="bg-green-50"
                textColor="text-green-900"
              />
              <StatsCard
                title="平均使用量/回"
                value={`${
                  stat.usageCount > 0
                    ? (stat.totalUsage / stat.usageCount).toFixed(1)
                    : "0"
                }`}
                bgColor="bg-purple-50"
                textColor="text-purple-900"
              />
            </div>

            {/* 施術タイプ別使用量 */}
            <div className="mt-6">
              <h4 className="font-medium mb-4">施術タイプ別使用量</h4>
              <div className="grid gap-4">
                {stat.serviceTypeUsage.map((usage) => (
                  <div
                    key={usage.serviceTypeId}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {usage.serviceTypeName} {/* IDの代わりに名前を表示 */}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {usage.count}回使用
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {usage.amount.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        平均: {(usage.amount / usage.count).toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 予測情報（実装されている場合） */}
            {stat.predictedUsage !== null && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">予測情報</h4>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">予測使用量</p>
                  <p className="font-medium">
                    {stat.predictedUsage.toFixed(1)}
                  </p>
                </div>
                {stat.predictionConfidence !== null && (
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-gray-600">予測信頼度</p>
                    <p className="font-medium">
                      {stat.predictionConfidence.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* ページネーション */}
      {data?.hasNextPage && !searchQuery && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            さらに表示
          </button>
        </div>
      )}
    </div>
  );
}
