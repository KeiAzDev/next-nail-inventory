//src/components/store/store-statistics.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { useClimateData } from '@/hooks/queries/use-climate-data';
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

interface CorrelationBarProps {
  title: string;
  value: number;
}

function StatsCard({ title, value, bgColor, textColor }: StatsCardProps) {
  return (
    <div className={`p-4 rounded-lg ${bgColor}`}>
      <h4 className={`font-semibold ${textColor}`}>{title}</h4>
      <p className="text-2xl font-medium">{value}</p>
    </div>
  );
}

function CorrelationBar({ title, value }: CorrelationBarProps) {
  const normalizedValue = Math.abs(value) * 100;
  const correlationText = value > 0 ? '正の相関' : value < 0 ? '負の相関' : '相関なし';

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-gray-500">
          {correlationText} ({(value * 100).toFixed(1)}%)
        </span>
      </div>
      <Progress value={normalizedValue} />
    </div>
  );
}

function calculateCorrelation(
  data: MonthlyServiceStat[],
  key1: 'temperature' | 'humidity',
  key2: 'totalUsage'
): number {
  if (!data || data.length < 2) return 0;

  const values1 = data.map(d => d[key1]).filter((v): v is number => v !== null);
  const values2 = data.map(d => d[key2]).filter((v): v is number => v !== null);

  if (values1.length !== values2.length || values1.length < 2) return 0;

  const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
  const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

  const deviations1 = values1.map(v => v - mean1);
  const deviations2 = values2.map(v => v - mean2);

  const sumProducts = deviations1.reduce((a, b, i) => a + b * deviations2[i], 0);
  const sumSquares1 = deviations1.reduce((a, b) => a + b * b, 0);
  const sumSquares2 = deviations2.reduce((a, b) => a + b * b, 0);

  return sumProducts / Math.sqrt(sumSquares1 * sumSquares2);
}

export default function StoreStatistics({ storeId }: StoreStatisticsProps) {
  const { data: statistics, isLoading: isStatsLoading } = useQuery({
    queryKey: ['statistics', storeId],
    queryFn: () => fetchStoreStatistics(storeId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1
  });

  const { data: climateData, locationState } = useClimateData();
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
        temperature: stat.temperature,
        humidity: stat.humidity
      };
    });
  };

  return (
    <div className="space-y-6">
      {locationState?.error && (
        <Card>
          <CardContent className="pt-6">
            <div className="p-4 text-amber-800 bg-amber-50 rounded-lg">
              <p className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  strokeWidth="2"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                {locationState.error}
              </p>
              {locationState.status === 'error' && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm text-amber-600 hover:text-amber-800 flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  再試行
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="h-72">
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
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      domain={[0, 100]}
                      label={{ value: '湿度 (%)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        switch (name) {
                          case 'usage':
                            return [`${value.toFixed(1)}ml`, '実際の使用量'];
                          case 'predicted':
                            return [`${value.toFixed(1)}ml`, '予測使用量'];
                          case 'humidity':
                            return [`${value}%`, '湿度'];
                          case 'temperature':
                            return [`${value}℃`, '気温'];
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
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="predicted"
                      stroke="#db2777"
                      name="予測使用量"
                      strokeDasharray="5 5"
                    />
                    {serviceStats.monthlyStats.some(stat => stat.humidity !== null) && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="humidity"
                        stroke="#84cc16"
                        name="湿度"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {serviceStats.monthlyStats.length > 0 && climateData && (
                <div className="mt-6">
                  <h4 className="font-medium mb-4">環境要因との相関</h4>
                  <div className="space-y-4">
                    <CorrelationBar
                      title="気温との相関"
                      value={calculateCorrelation(
                        serviceStats.monthlyStats,
                        'temperature',
                        'totalUsage'
                      )}
                    />
                    <CorrelationBar
                      title="湿度との相関"
                      value={calculateCorrelation(
                        serviceStats.monthlyStats,
                        'humidity',
                        'totalUsage'
                      )}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}