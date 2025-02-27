//src/app/api/migrate-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// MongoDBの結果型の定義
interface MongoCommandResult {
  cursor?: {
    firstBatch?: any[];
    id?: string;
  };
  ok?: number;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const migrationResult = await prisma.$transaction(async (tx) => {
      const results = {
        products: {
          updated: 0,
          details: [] as any[]
        },
        serviceTypes: {
          updated: 0,
          details: [] as any[]
        },
        monthlyStats: {
          updated: 0,
          details: [] as any[]
        }
      };

      // 1. Product モデルの更新
      const findOldProducts = await tx.$runCommandRaw({
        find: "Product",
        filter: { type: "POLISH" }
      }) as MongoCommandResult;
      
      const oldProducts = findOldProducts.cursor?.firstBatch || [];
      console.log(`Found ${oldProducts.length} products with POLISH type`);
      
      for (const product of oldProducts) {
        await tx.$runCommandRaw({
          update: "Product",
          updates: [
            {
              q: { _id: product._id },
              u: { 
                $set: { 
                  type: "POLISH_COLOR",
                  isLiquid: true,
                  useColorPicker: true
                } 
              }
            }
          ]
        });
        
        results.products.details.push({
          id: product._id,
          name: product.productName,
          oldType: "POLISH",
          newType: "POLISH_COLOR"
        });
      }
      
      results.products.updated = oldProducts.length;

      // 2. ServiceType モデルの更新
      const findOldServiceTypes = await tx.$runCommandRaw({
        find: "ServiceType",
        filter: { productType: "POLISH" }
      }) as MongoCommandResult;
      
      const oldServiceTypes = findOldServiceTypes.cursor?.firstBatch || [];
      console.log(`Found ${oldServiceTypes.length} service types with POLISH productType`);
      
      for (const serviceType of oldServiceTypes) {
        await tx.$runCommandRaw({
          update: "ServiceType",
          updates: [
            {
              q: { _id: serviceType._id },
              u: { 
                $set: { 
                  productType: "POLISH_COLOR"
                } 
              }
            }
          ]
        });
        
        results.serviceTypes.details.push({
          id: serviceType._id,
          name: serviceType.name,
          oldType: "POLISH",
          newType: "POLISH_COLOR"
        });
      }
      
      results.serviceTypes.updated = oldServiceTypes.length;
      
      // 3. MonthlyServiceStat の更新が必要な場合（serviceTypeIdを介して間接的に参照）
      // serviceTypeIdを使って参照しているのでこのままでも機能する可能性がありますが、
      // 念のため確認と処理を行います
      
      // ServiceTypeの変更を全店舗に適用（必要に応じて）
      // ここでは変更したServiceTypeに関連するMonthlyServiceStatを更新します
      
      // 変更したサービスタイプのIDを取得
      const updatedServiceTypeIds = oldServiceTypes.map(st => st._id);
      
      // 関連するMonthlyServiceStatを検索
      for (const serviceTypeId of updatedServiceTypeIds) {
        const statsResult = await tx.$runCommandRaw({
          find: "MonthlyServiceStat",
          filter: { serviceTypeId }
        }) as MongoCommandResult;
        
        const stats = statsResult.cursor?.firstBatch || [];
        console.log(`Found ${stats.length} monthly stats for service type ${serviceTypeId}`);
        
        // 特別な更新が必要ならここで行います
        // この例では実際にデータを変更していませんが、必要に応じて変更できます
        for (const stat of stats) {
          results.monthlyStats.details.push({
            id: stat._id,
            serviceTypeId: stat.serviceTypeId,
            year: stat.year,
            month: stat.month,
            action: "checked"
          });
        }
        
        results.monthlyStats.updated += stats.length;
      }
      
      // 4. その他の品質調査 - 未設定のフラグを持つ商品をチェック
      const productTypesToUpdate = ["GEL_COLOR", "GEL_BASE", "GEL_TOP", "GEL_REMOVER"];
      let additionalProductsUpdated = 0;
      
      for (const productType of productTypesToUpdate) {
        const findProducts = await tx.$runCommandRaw({
          find: "Product",
          filter: { 
            type: productType,
            $or: [
              { isLiquid: { $exists: false } },
              { useColorPicker: { $exists: false } }
            ]
          }
        }) as MongoCommandResult;
        
        const products = findProducts.cursor?.firstBatch || [];
        console.log(`Found ${products.length} ${productType} products missing flags`);
        
        for (const product of products) {
          const isLiquid = ["GEL_COLOR", "GEL_BASE", "GEL_TOP", "GEL_REMOVER", "POLISH_COLOR"].includes(product.type);
          const useColorPicker = ["GEL_COLOR", "POLISH_COLOR"].includes(product.type);
          
          await tx.$runCommandRaw({
            update: "Product",
            updates: [
              {
                q: { _id: product._id },
                u: { 
                  $set: { 
                    isLiquid,
                    useColorPicker
                  } 
                }
              }
            ]
          });
          
          additionalProductsUpdated++;
        }
      }
      
      return {
        ...results,
        additionalProductsUpdated
      };
    });

    return NextResponse.json({
      success: true,
      message: '包括的なマイグレーションが完了しました',
      details: migrationResult
    });
  } catch (error) {
    console.error('Comprehensive migration error:', error);
    return NextResponse.json(
      { error: 'マイグレーションに失敗しました', details: error },
      { status: 500 }
    );
  }
}