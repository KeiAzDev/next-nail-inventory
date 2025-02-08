//src/app/api/stores/[id]/statistics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.pathname.split("/")[3];

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.storeId !== storeId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const serviceTypes = await prisma.serviceType.findMany({
      where: { storeId },
      include: {
        usages: {
          orderBy: { date: "desc" },
          take: 12,
          select: {
            date: true,
            usageAmount: true,
            serviceTypeId: true,
          },
        },
      },
    });

    const statistics = await Promise.all(
      serviceTypes.map(async (serviceType) => {
        const monthlyData = serviceType.usages.reduce((acc, usage) => {
          const date = new Date(usage.date);
          const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

          if (!acc[key]) {
            acc[key] = {
              month: date.getMonth() + 1,
              year: date.getFullYear(),
              totalUsage: 0,
              usageCount: 0,
            };
          }

          acc[key].totalUsage += usage.usageAmount;
          acc[key].usageCount++;
          return acc;
        }, {} as Record<string, any>);

        const monthlyStats = Object.values(monthlyData)
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          })
          .map((stat) => ({
            id: `${serviceType.id}-${stat.year}-${stat.month}`,
            serviceTypeId: serviceType.id,
            month: stat.month,
            year: stat.year,
            totalUsage: stat.totalUsage,
            averageUsage: stat.totalUsage / stat.usageCount,
            usageCount: stat.usageCount,
            temperature: null,
            humidity: null,
            seasonalRate: null,
            designUsageStats: null,
            predictedUsage: null,
            actualDeviation: null,
            averageTimePerUse: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

        return {
          serviceTypeId: serviceType.id,
          serviceName: serviceType.name,
          totalUsageCount: serviceType.usages.length,
          totalUsageAmount: serviceType.usages.reduce(
            (sum, u) => sum + u.usageAmount,
            0
          ),
          monthlyStats,
        };
      })
    );

    return NextResponse.json({ statistics });
  } catch (error) {
    console.error(
      "Statistics API Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
