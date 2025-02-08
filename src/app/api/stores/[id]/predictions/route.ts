// src/app/api/stores/[id]/predictions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { generatePrediction } from '@/lib/prediction/prediction-engine';
import type { MonthlyServiceStat } from '@/types/api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // パラメータをURLから直接取得
    const storeId = await params.id;
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // prisma.$transactionを使用
    const predictionData = await prisma.$transaction(async (prisma) => {
      // 店舗の存在確認
      const store = await prisma.store.findUnique({
        where: { id: storeId }
      });

      if (!store) {
        throw new Error('Store not found');
      }

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // サービスタイプの取得
      const serviceTypes = await prisma.serviceType.findMany({
        where: { storeId }
      });

      if (!serviceTypes.length) {
        return { predictions: [] };
      }

      // 各サービスタイプの使用履歴を取得
      const predictions = await Promise.all(
        serviceTypes.map(async (serviceType) => {
          // 過去12ヶ月の使用データを取得
          const usages = await prisma.usage.findMany({
            where: {
              serviceTypeId: serviceType.id
            },
            orderBy: {
              date: 'desc'
            },
            take: 12,
            select: {
              id: true,
              date: true,
              usageAmount: true,
              serviceTypeId: true
            }
          });

          // 月次データに集計
          const monthlyStats = usages.reduce<Record<string, MonthlyServiceStat>>((acc, usage) => {
            const date = new Date(usage.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            
            if (!acc[key]) {
              acc[key] = {
                id: `${serviceType.id}-${key}`,
                serviceTypeId: serviceType.id,
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                totalUsage: 0,
                averageUsage: 0,
                usageCount: 0,
                temperature: null,
                humidity: null,
                seasonalRate: null,
                designUsageStats: null,
                predictedUsage: null,
                actualDeviation: null,
                averageTimePerUse: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            }

            acc[key].totalUsage += usage.usageAmount;
            acc[key].usageCount += 1;
            acc[key].averageUsage = acc[key].totalUsage / acc[key].usageCount;

            return acc;
          }, {});

          const stats = Object.values(monthlyStats);
          const prediction = generatePrediction(stats, currentMonth);

          // 既存の月次統計を取得
          const existingStat = await prisma.monthlyServiceStat.findUnique({
            where: {
              monthlyStatIdentifier: {
                serviceTypeId: serviceType.id,
                year: currentYear,
                month: currentMonth + 1
              }
            }
          });

          // 実績値がある場合は予測との差分を計算
          const actualDeviation = existingStat?.totalUsage 
            ? Math.abs(prediction.predictedUsage - existingStat.totalUsage)
            : null;

          // 予測データを保存
          await prisma.monthlyServiceStat.upsert({
            where: {
              monthlyStatIdentifier: {
                serviceTypeId: serviceType.id,
                year: currentYear,
                month: currentMonth + 1
              }
            },
            create: {
              serviceTypeId: serviceType.id,
              month: currentMonth + 1,
              year: currentYear,
              totalUsage: existingStat?.totalUsage ?? 0,
              averageUsage: existingStat?.averageUsage ?? 0,
              usageCount: existingStat?.usageCount ?? 0,
              predictedUsage: prediction.predictedUsage,
              actualDeviation,
              temperature: existingStat?.temperature ?? null,
              humidity: existingStat?.humidity ?? null,
              seasonalRate: prediction.factors.seasonalFactor,
              designUsageStats: existingStat?.designUsageStats ?? null,
              averageTimePerUse: existingStat?.averageTimePerUse ?? null
            },
            update: {
              predictedUsage: prediction.predictedUsage,
              actualDeviation,
              seasonalRate: prediction.factors.seasonalFactor
            }
          });

          return {
            serviceTypeId: serviceType.id,
            serviceName: serviceType.name,
            ...prediction
          };
        })
      );

      return { predictions };
    });

    return NextResponse.json({
      predictions: predictionData.predictions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Prediction API Error:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.message === 'Store not found') {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: '予測データの生成に失敗しました' },
      { status: 500 }
    );
  }
}