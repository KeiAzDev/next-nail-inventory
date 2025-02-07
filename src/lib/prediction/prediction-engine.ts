// src/lib/prediction/prediction-engine.ts

import type { MonthlyServiceStat } from '@/types/api';

export interface PredictionResult {
  predictedUsage: number;
  confidence: number;
  factors: {
    baseMovingAverage: number;
    seasonalFactor: number;
    monthTrend: number;
  };
}

/**
 * 移動平均を計算
 */
export function calculateMovingAverage(
  usageData: MonthlyServiceStat[],
  months: number = 3
): number {
  if (!usageData.length) return 0;
  
  const sortedData = [...usageData].sort((a, b) => {
    return new Date(b.year, b.month).getTime() - new Date(a.year, a.month).getTime();
  });
  
  const recentData = sortedData.slice(0, months);
  
  const sum = recentData.reduce((acc, stat) => acc + stat.totalUsage, 0);
  return sum / recentData.length;
}

/**
 * 月ごとの傾向を計算
 */
function calculateMonthTrend(
  usageData: MonthlyServiceStat[],
  currentMonth: number
): number {
  const monthData = usageData.filter(stat => stat.month === currentMonth + 1);
  if (monthData.length < 2) return 1;

  const sortedByYear = [...monthData].sort((a, b) => b.year - a.year);
  const thisYear = sortedByYear[0].totalUsage;
  const lastYear = sortedByYear[1].totalUsage;

  return lastYear > 0 ? thisYear / lastYear : 1;
}

/**
 * 季節係数を計算
 */
export function calculateSeasonalFactor(
  usageData: MonthlyServiceStat[],
  currentMonth: number
): number {
  // 各月のデータを集計
  const monthlyTotals = new Array(12).fill(0);
  const monthCounts = new Array(12).fill(0);

  usageData.forEach(stat => {
    const monthIndex = stat.month - 1;
    monthlyTotals[monthIndex] += stat.totalUsage;
    monthCounts[monthIndex]++;
  });

  // 月別平均を計算
  const monthlyAverages = monthlyTotals.map((total, index) => 
    monthCounts[index] > 0 ? total / monthCounts[index] : 0
  );

  // 全体の平均を計算
  const overallAverage = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / 
    monthlyAverages.filter(avg => avg > 0).length;

  // 季節係数を計算（データがない月は1.0とする）
  if (overallAverage === 0) return 1.0;
  
  const seasonalFactor = monthlyAverages[currentMonth] / overallAverage;
  return seasonalFactor || 1.0;
}

/**
 * 予測の信頼度を計算
 */
function calculateConfidence(
  usageData: MonthlyServiceStat[],
  monthTrend: number
): number {
  if (usageData.length < 3) return 0;

  // データ量による信頼度（最大12ヶ月分で100%）
  const dataCountFactor = Math.min(usageData.length / 12, 1);

  // トレンドの安定性（1.0に近いほど安定）
  const trendStability = Math.max(0, 1 - Math.abs(1 - monthTrend));

  // 変動係数による信頼度
  const values = usageData.map(stat => stat.totalUsage);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean !== 0 ? stdDev / mean : 1;
  const variabilityFactor = Math.max(0, 1 - coefficientOfVariation);

  // 総合的な信頼度を計算（0-100%）
  return (
    (dataCountFactor * 0.4 + 
    trendStability * 0.3 + 
    variabilityFactor * 0.3) * 100
  );
}

/**
 * 使用量予測を生成
 */
export function generatePrediction(
  usageData: MonthlyServiceStat[],
  currentMonth: number
): PredictionResult {
  // 基本となる移動平均を計算
  const baseMovingAverage = calculateMovingAverage(usageData);

  // 季節係数を計算
  const seasonalFactor = calculateSeasonalFactor(usageData, currentMonth);

  // 月別トレンドを計算
  const monthTrend = calculateMonthTrend(usageData, currentMonth);

  // 予測使用量を計算
  const predictedUsage = baseMovingAverage * seasonalFactor * monthTrend;

  // 予測の信頼度を計算
  const confidence = calculateConfidence(usageData, monthTrend);

  return {
    predictedUsage,
    confidence,
    factors: {
      baseMovingAverage,
      seasonalFactor,
      monthTrend
    }
  };
}