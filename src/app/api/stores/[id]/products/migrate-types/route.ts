//src/app/api/stores/[id]/products/migrate-types/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// MongoDBの結果型の定義
interface MongoCommandResult {
  cursor?: {
    firstBatch?: any[];
    id?: string;
  };
  ok?: number;
  [key: string]: any;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await context.params
    const storeId = resolvedParams.id
    
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // MongoDBに直接コマンドを実行して古いタイプを持つ商品を検索
    const migrationResult = await prisma.$transaction(async (tx) => {
      // 古いPOLISHタイプの商品をPOLISH_COLORに更新
      const findOldPolishProducts = await tx.$runCommandRaw({
        find: "Product",
        filter: { 
          storeId,
          type: "POLISH"
        }
      }) as MongoCommandResult;
      
      const oldPolishProducts = findOldPolishProducts.cursor?.firstBatch || [];
      console.log(`Found ${oldPolishProducts.length} products with old POLISH type`);
      
      const polishMigrationResults: { id: string; name: string; oldType: string; newType: string }[] = [];
      
      for (const product of oldPolishProducts) {
        // 更新操作
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
        
        polishMigrationResults.push({
          id: product._id,
          name: product.productName,
          oldType: "POLISH",
          newType: "POLISH_COLOR"
        });
      }
      
      // GEL_COLOR商品にフラグを設定
      const findGelColorProducts = await tx.$runCommandRaw({
        find: "Product",
        filter: { 
          storeId,
          type: "GEL_COLOR"
        }
      }) as MongoCommandResult;
      
      const gelColorProducts = findGelColorProducts.cursor?.firstBatch || [];
      console.log(`Found ${gelColorProducts.length} GEL_COLOR products to update`);
      
      const gelColorMigrationResults: { id: string; name: string; type: string; action: string }[] = [];
      
      for (const product of gelColorProducts) {
        // 既にフラグが設定されているものはスキップ
        if (product.isLiquid !== undefined && product.useColorPicker !== undefined) {
          continue;
        }
        
        // 更新操作
        await tx.$runCommandRaw({
          update: "Product",
          updates: [
            {
              q: { _id: product._id },
              u: { 
                $set: { 
                  isLiquid: true,
                  useColorPicker: true
                } 
              }
            }
          ]
        });
        
        gelColorMigrationResults.push({
          id: product._id,
          name: product.productName,
          type: "GEL_COLOR",
          action: "flags updated"
        });
      }
      
      // GEL_BASE商品にフラグを設定
      const findGelBaseProducts = await tx.$runCommandRaw({
        find: "Product",
        filter: { 
          storeId,
          type: "GEL_BASE"
        }
      }) as MongoCommandResult;
      
      const gelBaseProducts = findGelBaseProducts.cursor?.firstBatch || [];
      console.log(`Found ${gelBaseProducts.length} GEL_BASE products to update`);
      
      const gelBaseMigrationResults: { id: string; name: string; type: string; action: string }[] = [];
      
      for (const product of gelBaseProducts) {
        // 既にフラグが設定されているものはスキップ
        if (product.isLiquid !== undefined && product.useColorPicker !== undefined) {
          continue;
        }
        
        // 更新操作
        await tx.$runCommandRaw({
          update: "Product",
          updates: [
            {
              q: { _id: product._id },
              u: { 
                $set: { 
                  isLiquid: true,
                  useColorPicker: false
                } 
              }
            }
          ]
        });
        
        gelBaseMigrationResults.push({
          id: product._id,
          name: product.productName,
          type: "GEL_BASE",
          action: "flags updated"
        });
      }
      
      // GEL_TOP商品にフラグを設定
      const findGelTopProducts = await tx.$runCommandRaw({
        find: "Product",
        filter: { 
          storeId,
          type: "GEL_TOP"
        }
      }) as MongoCommandResult;
      
      const gelTopProducts = findGelTopProducts.cursor?.firstBatch || [];
      console.log(`Found ${gelTopProducts.length} GEL_TOP products to update`);
      
      const gelTopMigrationResults: { id: string; name: string; type: string; action: string }[] = [];
      
      for (const product of gelTopProducts) {
        // 既にフラグが設定されているものはスキップ
        if (product.isLiquid !== undefined && product.useColorPicker !== undefined) {
          continue;
        }
        
        // 更新操作
        await tx.$runCommandRaw({
          update: "Product",
          updates: [
            {
              q: { _id: product._id },
              u: { 
                $set: { 
                  isLiquid: true,
                  useColorPicker: false
                } 
              }
            }
          ]
        });
        
        gelTopMigrationResults.push({
          id: product._id,
          name: product.productName,
          type: "GEL_TOP",
          action: "flags updated"
        });
      }
      
      return {
        polishMigration: polishMigrationResults,
        gelColorMigration: gelColorMigrationResults,
        gelBaseMigration: gelBaseMigrationResults,
        gelTopMigration: gelTopMigrationResults,
        stats: {
          polishUpdated: polishMigrationResults.length,
          gelColorUpdated: gelColorMigrationResults.length,
          gelBaseUpdated: gelBaseMigrationResults.length,
          gelTopUpdated: gelTopMigrationResults.length,
          totalUpdated: 
            polishMigrationResults.length + 
            gelColorMigrationResults.length + 
            gelBaseMigrationResults.length + 
            gelTopMigrationResults.length
        }
      };
    });

    return NextResponse.json({
      success: true,
      message: 'マイグレーションが完了しました',
      details: migrationResult
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'マイグレーションに失敗しました', details: error },
      { status: 500 }
    );
  }
}