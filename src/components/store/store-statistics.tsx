//src/components/store/store-statistics.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { fetchStoreStatistics } from '@/lib/api-client';
import { usePredictions } from '@/hooks/queries/use-predictions';
import type { MonthlyServiceStat } from '@/types/api';

interface StoreStatisticsProps {
  storeId: string;
}

interface ChartData {
  month: string;
  usage: number;
  predicted: number;
  temperature: number | null;
  humidity: number | null;
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

function calculateDeviation(actual: number, predicted: number): string {
  const deviation = ((actual - predicted) / predicted) * 100;
  return deviation > 0 ? `+${deviation.toFixed(1)}%` : `${deviation.toFixed(1)}%`;
}

export default function StoreStatistics({ storeId }: StoreStatisticsProps) {
  const [showEnvironmentalData, setShowEnvironmentalData] = useState(false);

  const { data: statistics, isLoading: isStatsLoading } = useQuery({
    queryKey: ['statistics', storeId],
    queryFn: () => fetchStoreStatistics(storeId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1
  });

  const { data: predictions } = usePredictions(storeId);

  if (isStatsLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="w-full bg-gray-50">
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

  const formatMonthlyData = (monthlyStats: MonthlyServiceStat[], serviceTypeId: string): ChartData[] => {
    return monthlyStats.map(stat => {
      const prediction = predictions?.predictions.find(p => p.serviceTypeId === serviceTypeId);
      
      return {
        month: `${stat.year}/${String(stat.month).padStart(2, '0')}`,
        usage: stat.totalUsage,
        predicted: prediction?.predictedUsage || 0,
        temperature: stat.temperature ?? null,
        humidity: stat.humidity ?? null,
      };
    });
  };

  return (
    <div className="space-y-6">
      {statistics?.statistics.map((serviceStats) => {
        const prediction = predictions?.predictions.find(
          p => p.serviceTypeId === serviceStats.serviceTypeId
        );

        return (
          <Card key={serviceStats.serviceTypeId}>
            <CardHeader>
              <CardTitle>{serviceStats.serviceName}</CardTitle>
              {prediction && (
                <div className="mt-2 text-sm text-gray-600">
                  予測信頼度: {prediction.confidence.toFixed(1)}%
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* 使用量情報カード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard
                  title="総使用回数"
                  value={`${serviceStats.totalUsageCount}回`}
                  bgColor="bg-blue-50"
                  textColor="text-blue-900"
                />
                <StatsCard
                  title="総使用量"
                  value={`${serviceStats.totalUsageAmount.toFixed(1)}ml`}
                  bgColor="bg-pink-50"
                  textColor="text-pink-900"
                />
                <StatsCard
                  title="平均使用量/回"
                  value={`${(serviceStats.totalUsageAmount / serviceStats.totalUsageCount).toFixed(1)}ml`}
                  bgColor="bg-purple-50"
                  textColor="text-purple-900"
                />
              </div>

              {/* メインチャート */}
              <div className="h-72 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatMonthlyData(serviceStats.monthlyStats, serviceStats.serviceTypeId)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      label={{ value: '月', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: '使用量', angle: -90, position: 'insideLeft' }}
                    />
                    {showEnvironmentalData && (
                      <YAxis 
                        yAxisId="right" 
                        orientation="right"
                        domain={[0, 100]}
                        label={{ value: '湿度 (%)', angle: 90, position: 'insideRight' }}
                      />
                    )}
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        switch (name) {
                          case 'usage':
                            return [`${value.toFixed(1)}ml`, '実際の使用量'];
                          case 'predicted':
                            return [`${value.toFixed(1)}ml`, '予測使用量'];
                          case 'humidity':
                            return [`${value}%`, '湿度（参考値）'];
                          case 'temperature':
                            return [`${value}℃`, '気温（参考値）'];
                          default:
                            return [value, name];
                        }
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="usage"
                      stroke="#2563eb"
                      name="実際の使用量"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="predicted"
                      stroke="#db2777"
                      name="予測使用量"
                      strokeDasharray="5 5"
                    />
                    {showEnvironmentalData && serviceStats.monthlyStats.some(stat => stat.humidity !== null) && (
                      <>
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="humidity"
                          stroke="#84cc16"
                          name="湿度（参考値）"
                          strokeWidth={1}
                          opacity={0.6}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 予測情報 */}
              {prediction && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">予測分析</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">基準使用量</p>
                      <p className="font-medium">
                        {prediction.factors.baseMovingAverage.toFixed(1)}ml
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">季節係数</p>
                      <p className="font-medium">
                        {prediction.factors.seasonalFactor.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">月次トレンド</p>
                      <p className="font-medium">
                        {prediction.factors.monthTrend.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 環境データ表示切り替え */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowEnvironmentalData(!showEnvironmentalData)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {showEnvironmentalData ? '環境データを隠す' : '環境データを表示'}
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}