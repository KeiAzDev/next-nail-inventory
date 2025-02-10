// src/app/api/stores/[id]/statistics/service-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. パラメータの取得と検証
    const storeId = request.nextUrl.pathname.split("/")[3];
    const searchParams = request.nextUrl.searchParams;
    
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // 2. 認証チェック
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.storeId !== storeId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. 期間の設定
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 4. データ取得
    const serviceTypes = await prisma.serviceType.findMany({
      where: { storeId },
      include: {
        usages: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                colorName: true,
                colorCode: true,
              }
            }
          }
        }
      }
    });

    // 5. 統計データの集計
    const statistics = serviceTypes.map(serviceType => {
      // カラー使用統計の集計
      const colorUsage = Object.values(
        serviceType.usages.reduce((acc, usage) => {
          const key = usage.product.id;
          if (!acc[key]) {
            acc[key] = {
              productId: usage.product.id,
              productName: usage.product.productName,
              colorName: usage.product.colorName,
              colorCode: usage.product.colorCode,
              usageCount: 0,
              totalAmount: 0
            };
          }
          acc[key].usageCount++;
          acc[key].totalAmount += usage.usageAmount;
          return acc;
        }, {} as Record<string, any>)
      );

      // 月次トレンドの作成
      const monthlyTrend = serviceType.usages.reduce((acc, usage) => {
        const monthKey = usage.date.toISOString().slice(0, 7); // "YYYY-MM" 形式
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            usageCount: 0,
            colors: {}
          };
        }
        acc[monthKey].usageCount++;
        
        const colorKey = usage.product.colorName;
        if (!acc[monthKey].colors[colorKey]) {
          acc[monthKey].colors[colorKey] = 0;
        }
        acc[monthKey].colors[colorKey]++;
        
        return acc;
      }, {} as Record<string, any>);

      // 月次トレンドの整形
      const formattedMonthlyTrend = Object.values(monthlyTrend).map(trend => ({
        month: trend.month,
        usageCount: trend.usageCount,
        popularColors: Object.entries(trend.colors)
          .map(([colorName, count]) => ({
            colorName,
            usageCount: count as number
          }))
          .sort((a, b) => b.usageCount - a.usageCount)
      }));

      return {
        serviceTypeId: serviceType.id,
        serviceName: serviceType.name,
        totalUsageCount: serviceType.usages.length,
        colorUsage,
        monthlyTrend: formattedMonthlyTrend
      };
    });

    return NextResponse.json({ statistics });

  } catch (error) {
    console.error(
      "Service Type Statistics API Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to fetch service type statistics" },
      { status: 500 }
    );
  }
}