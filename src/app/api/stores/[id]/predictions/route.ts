// src/app/api/stores/[id]/predictions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { generatePrediction } from '@/lib/prediction/prediction-engine';
import type { MonthlyServiceStat } from '@/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // パラメータの検証
    if (!params?.id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 店舗の存在確認
    const store = await prisma.store.findUnique({
      where: { id: params.id }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // 現在の月を取得
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // 店舗のサービスタイプを取得
    const serviceTypes = await prisma.serviceType.findMany({
      where: {
        storeId: params.id
      },
      include: {
        monthlyStats: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ],
          take: 12 // 過去12ヶ月分のデータを取得
        }
      }
    });

    if (!serviceTypes.length) {
      return NextResponse.json({
        predictions: [],
        timestamp: new Date().toISOString()
      });
    }

    // サービスタイプごとの予測を生成
    const predictions = await Promise.all(
      serviceTypes.map(async (serviceType) => {
        // Prismaから返されるデータを安全に変換
        const formattedStats: MonthlyServiceStat[] = serviceType.monthlyStats.map(stat => {
          // designUsageStatsの安全な変換
          let parsedDesignStats: Record<string, number> | null = null;
          if (stat.designUsageStats) {
            try {
              const parsed = typeof stat.designUsageStats === 'string' 
                ? JSON.parse(stat.designUsageStats)
                : stat.designUsageStats;
              
              if (typeof parsed === 'object' && parsed !== null) {
                parsedDesignStats = Object.entries(parsed).reduce((acc, [key, value]) => {
                  if (typeof value === 'number') {
                    acc[key] = value;
                  }
                  return acc;
                }, {} as Record<string, number>);
              }
            } catch (e) {
              console.warn('Failed to parse designUsageStats:', e);
            }
          }

          return {
            id: stat.id,
            serviceTypeId: stat.serviceTypeId,
            month: stat.month,
            year: stat.year,
            totalUsage: stat.totalUsage,
            averageUsage: stat.averageUsage,
            usageCount: stat.usageCount,
            temperature: stat.temperature,
            humidity: stat.humidity,
            seasonalRate: stat.seasonalRate,
            designUsageStats: parsedDesignStats,
            predictedUsage: stat.predictedUsage,
            actualDeviation: stat.actualDeviation,
            averageTimePerUse: stat.averageTimePerUse,
            createdAt: stat.createdAt.toISOString(),
            updatedAt: stat.updatedAt.toISOString()
          };
        });

        const prediction = generatePrediction(
          formattedStats,
          currentMonth
        );

        try {
          // 既存の統計データを検索
          const existingStat = await prisma.monthlyServiceStat.findFirst({
            where: {
              serviceTypeId: serviceType.id,
              year: currentYear,
              month: currentMonth + 1
            }
          });

          // 予測データを保存または更新
          if (existingStat) {
            await prisma.monthlyServiceStat.update({
              where: { id: existingStat.id },
              data: {
                predictedUsage: prediction.predictedUsage,
                actualDeviation: existingStat.totalUsage > 0 
                  ? Math.abs(prediction.predictedUsage - existingStat.totalUsage) 
                  : null
              }
            });
          } else {
            await prisma.monthlyServiceStat.create({
              data: {
                serviceTypeId: serviceType.id,
                month: currentMonth + 1,
                year: currentYear,
                totalUsage: 0,
                averageUsage: 0,
                usageCount: 0,
                predictedUsage: prediction.predictedUsage
              }
            });
          }
        } catch (error) {
          console.error(`Failed to update stats for service type ${serviceType.id}:`, error);
          // 統計の更新に失敗しても予測は返す
        }

        return {
          serviceTypeId: serviceType.id,
          serviceName: serviceType.name,
          ...prediction
        };
      })
    );

    return NextResponse.json({
      predictions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Prediction API Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}