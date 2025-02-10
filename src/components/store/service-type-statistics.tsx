// src/components/store/service-type-statistics.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { fetchServiceTypeStatistics } from '@/lib/api-client';
import { DateRangeFilter } from './statistics/date-range-filter';

interface ServiceTypeStatisticsProps {
  storeId: string;
}

interface ColorUsage {
  productId: string;
  productName: string;
  colorName: string;
  colorCode: string;
  usageCount: number;
  totalAmount: number;
}

interface ServiceTypeStats {
  serviceTypeId: string;
  serviceName: string;
  totalUsageCount: number;
  colorUsage: ColorUsage[];
  monthlyTrend?: {
    month: string;
    usageCount: number;
    popularColors: Array<{
      colorName: string;
      usageCount: number;
    }>;
  }[];
}

export default function ServiceTypeStatistics({ storeId }: ServiceTypeStatisticsProps) {
  // 現在の年月を取得してYYYY-MM形式に変換
  const currentDate = new Date();
  const currentYearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // 期間選択のstate
  const [rangeType, setRangeType] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState<string>(currentYearMonth);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // APIクエリ
  const { data, isLoading } = useQuery({
    queryKey: ['serviceTypeStatistics', storeId, startDate, endDate],
    queryFn: () => fetchServiceTypeStatistics(storeId, {
      startDate,
      endDate
    }),
    staleTime: 1000 * 60 * 30,  // 30分
    gcTime: 1000 * 60 * 60,     // 1時間
  });

  // 期間タイプの変更ハンドラ
  const handleRangeTypeChange = (type: 'single' | 'range') => {
    setRangeType(type);
    if (type === 'single') {
      setEndDate(undefined);
    }
  };

  // 日付変更ハンドラ
  const handleDateChange = (start: string, end?: string) => {
    setStartDate(start);
    if (rangeType === 'range') {
      setEndDate(end);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          rangeType={rangeType}
          onRangeTypeChange={handleRangeTypeChange}
          onDateChange={handleDateChange}
        />
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-72 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        rangeType={rangeType}
        onRangeTypeChange={handleRangeTypeChange}
        onDateChange={handleDateChange}
      />

      {data?.statistics.map((stat: ServiceTypeStats) => (
        <Card key={stat.serviceTypeId}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{stat.serviceName}</span>
              <span className="text-sm text-gray-500">
                総施術回数: {stat.totalUsageCount}回
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 人気カラーランキング */}
              <div>
                <h3 className="font-medium mb-4">人気カラーランキング TOP 10</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stat.colorUsage
                    .sort((a, b) => b.usageCount - a.usageCount)
                    .slice(0, 10)
                    .map((color) => (
                      <div
                        key={color.productId}
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div
                          className="w-8 h-8 rounded"
                          style={{
                            backgroundColor: color.colorCode,
                            border: '1px solid #e2e8f0'
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{color.colorName}</p>
                          <p className="text-sm text-gray-500">
                            {color.productName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{color.usageCount}回</p>
                          <p className="text-sm text-gray-500">
                            {color.totalAmount.toFixed(1)}ml
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* 月次トレンド（データがある場合） */}
              {stat.monthlyTrend && stat.monthlyTrend.length > 0 && (
                <div>
                  <h3 className="font-medium mb-4">月次トレンド</h3>
                  <div className="space-y-4">
                    {stat.monthlyTrend.map((trend) => (
                      <div key={trend.month} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{trend.month}</span>
                          <span>{trend.usageCount}回</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          人気カラー: {trend.popularColors
                            .slice(0, 3)
                            .map(c => c.colorName)
                            .join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}