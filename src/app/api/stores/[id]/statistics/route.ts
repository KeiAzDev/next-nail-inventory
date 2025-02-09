//src/app/api/stores/[id]/statistics/route.ts
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

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

    // 3. 店舗の存在確認
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // 4. 商品統計データの取得
    const skip = (page - 1) * limit;
    
    // 月初と月末の日付を計算
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 商品と使用記録を取得
    const products = await prisma.product.findMany({
      where: { 
        storeId,
        ...(search ? {
          OR: [
            { productName: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { colorName: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      orderBy: {
        lastUsed: 'desc'
      },
      skip,
      take: limit,
      include: {
        usages: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            serviceType: true
          }
        },
        currentProductLots: true
      }
    });

    // 5. 総商品数の取得（ページネーション用）
    const totalProducts = await prisma.product.count({
      where: { 
        storeId,
        ...(search ? {
          OR: [
            { productName: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { colorName: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      }
    });

    // 6. 統計データの集計
    const statistics = products.map(product => {
      // 施術タイプごとの使用量を集計
      const serviceTypeUsage = product.usages.reduce((acc, usage) => {
        const existingUsage = acc.find(u => u.serviceTypeId === usage.serviceTypeId);
        if (existingUsage) {
          existingUsage.amount += usage.usageAmount;
          existingUsage.count += 1;
        } else {
          acc.push({
            serviceTypeId: usage.serviceTypeId,
            // serviceTypeの名前を追加
            serviceTypeName: usage.serviceType.name,
            amount: usage.usageAmount,
            count: 1
          });
        }
        return acc;
      }, [] as { 
        serviceTypeId: string;
        serviceTypeName: string;
        amount: number;
        count: number;
      }[]);
    
      // 総使用量と使用回数を計算
      const totalUsage = serviceTypeUsage.reduce((sum, usage) => sum + usage.amount, 0);
      const usageCount = serviceTypeUsage.reduce((sum, usage) => sum + usage.count, 0);
    
      // 残量の計算
      const remainingAmount = product.currentProductLots.reduce((sum, lot) => {
        if (lot.isInUse && lot.currentAmount !== null) {
          return sum + lot.currentAmount;
        }
        return sum;
      }, 0);
    
      return {
        productId: product.id,
        // 商品情報を追加
        brand: product.brand,
        productName: product.productName,
        colorName: product.colorName,
        type: product.type,
        capacityUnit: product.capacityUnit || 'ml',
        // 既存の統計情報
        year,
        month,
        totalUsage,
        usageCount,
        serviceTypeUsage,
        remainingAmount,
        estimatedDaysLeft: product.estimatedDaysLeft,
        lastUsedAt: product.lastUsed?.toISOString() || null,
        predictedUsage: null,
        predictionConfidence: null
      };
    });

    return NextResponse.json({
      statistics,
      totalProducts,
      hasNextPage: (page * limit) < totalProducts
    });

  } catch (error) {
    console.error(
      "Product Statistics API Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to fetch product statistics" },
      { status: 500 }
    );
  }
}
