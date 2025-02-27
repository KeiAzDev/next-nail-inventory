//src/app/api/stores/[id]/products/route.ts
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

    // 商品データを取得
    const products = await prisma.$transaction(async (tx) => {
      try {
        // 標準的なPrismaクエリを試行
        return await tx.product.findMany({
          where: { 
            storeId 
          },
          include: {
            currentProductLots: true
          },
          orderBy: {
            updatedAt: 'desc'
          }
        });
      } catch (err) {
        // POLISHタイプによるエラーが発生した場合、直接MongoDBクエリを使用
        console.log("商品取得エラー、直接MongoDBクエリを試行:", err);
        
        // MongoDBの直接クエリ
        const rawResult = await tx.$runCommandRaw({
          find: "Product",
          filter: { storeId },
          sort: { updatedAt: -1 }
        }) as MongoCommandResult;
        
        if (!rawResult.cursor || !rawResult.cursor.firstBatch) {
          throw new Error("MongoDB結果の形式が予期しないものです");
        }
        
        const rawProducts = rawResult.cursor.firstBatch;
        
        // ロット情報を取得
        const productIds = rawProducts.map(p => p._id);
        const lots = await tx.productLot.findMany({
          where: {
            productId: { in: productIds }
          }
        });
        
        // 整形
        return rawProducts.map(product => {
          // 古いタイプの変換
          if (product.type === 'POLISH') {
            product.type = 'POLISH_COLOR';
          }
          
          // 新しいフィールドのデフォルト設定
          product.isLiquid = product.isLiquid ?? true;
          product.useColorPicker = product.useColorPicker ?? true;
          
          // ロット情報を追加
          product.currentProductLots = lots.filter(lot => lot.productId === product._id);
          return product;
        });
      }
    });

    // レスポンスデータの整形
    const formattedProducts = products.map(product => {
      // 古いPOLISHタイプの場合、新しいPOLISH_COLORに変換
      let updatedType = product.type;
      if (updatedType === 'POLISH') {
        updatedType = 'POLISH_COLOR';
      }
      
      // 新しいフィールドのデフォルト設定
      const isLiquid = 'isLiquid' in product ? product.isLiquid : 
        ['POLISH_COLOR', 'POLISH', 'GEL_COLOR', 'GEL_BASE', 'GEL_TOP', 'GEL_REMOVER'].includes(updatedType);
      
      const useColorPicker = 'useColorPicker' in product ? product.useColorPicker :
        ['POLISH_COLOR', 'POLISH', 'GEL_COLOR'].includes(updatedType);
      
      return {
        ...product,
        type: updatedType,
        isLiquid,
        useColorPicker,
        lots: (product.currentProductLots || []).map((lot: any) => ({
          ...lot,
          startedAt: lot.startedAt?.toISOString() || null,
          createdAt: lot.createdAt instanceof Date ? lot.createdAt.toISOString() : (typeof lot.createdAt === 'string' ? lot.createdAt : new Date().toISOString()),
          updatedAt: lot.updatedAt instanceof Date ? lot.updatedAt.toISOString() : (typeof lot.updatedAt === 'string' ? lot.updatedAt : new Date().toISOString())
        })),
        createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : (typeof product.createdAt === 'string' ? product.createdAt : new Date().toISOString()),
        updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : (typeof product.updatedAt === 'string' ? product.updatedAt : new Date().toISOString()),
        lastUsed: product.lastUsed instanceof Date ? product.lastUsed.toISOString() : (product.lastUsed || null),
        currentProductLots: undefined  // この属性は削除
      }
    });

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: '商品情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    
    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    
    // 古いPOLISHタイプを新しいPOLISH_COLORに変換
    let productType = body.type;
    if (productType === 'POLISH') {
      productType = 'POLISH_COLOR';
    }
    
    // isLiquidとuseColorPickerのデフォルト値を設定
    const isLiquid = body.isLiquid ?? ['POLISH_COLOR', 'GEL_COLOR', 'GEL_BASE', 'GEL_TOP', 'GEL_REMOVER'].includes(productType);
    const useColorPicker = body.useColorPicker ?? ['POLISH_COLOR', 'GEL_COLOR'].includes(productType);

    // トランザクションで商品とロットを作成
    const result = await prisma.$transaction(async (tx) => {
      // 商品の作成
      const product = await tx.product.create({
        data: {
          brand: body.brand,
          productName: body.productName,
          colorCode: body.colorCode,
          colorName: body.colorName,
          type: productType,
          price: body.price,
          capacity: body.capacity,
          capacityUnit: body.capacityUnit,
          averageUsePerService: body.averageUsePerService,
          minStockAlert: body.minStockAlert,
          recommendedAlertPercentage: body.recommendedAlertPercentage,
          // ロット管理用フィールド
          totalQuantity: body.quantity,
          lotQuantity: body.quantity - 1,
          inUseQuantity: 1,
          // 新しいフィールド
          isLiquid,
          useColorPicker,
          // その他の初期値
          usageCount: 0,
          estimatedDaysLeft: null,
          averageUsesPerMonth: null,
          storeId: storeId,
        }
      })

      // アクティビティログの記録
      await tx.activity.create({
        data: {
          userId: session.user.id,
          type: 'PRODUCT_CREATE',
          action: '商品登録',
          metadata: {
            productName: body.productName,
            brand: body.brand,
            type: productType,
            colorName: body.colorName,
            capacity: body.capacity,
            capacityUnit: body.capacityUnit,
            quantity: body.quantity
          }
        }
      })

      // 使用中ロットの作成
      const inUseLot = await tx.productLot.create({
        data: {
          productId: product.id,
          isInUse: true,
          currentAmount: body.capacity || null,
          startedAt: new Date()
        }
      })

      // 未使用ロットの作成（quantity - 1個）
      if (body.quantity > 1) {
        const unusedLots = Array(body.quantity - 1).fill(null).map(() => ({
          productId: product.id,
          isInUse: false
        }))

        await tx.productLot.createMany({
          data: unusedLots
        })
      }

      // 作成した商品データを整形して返却
      const formattedProduct = {
        ...product,
        lots: [{
          ...inUseLot,
          startedAt: inUseLot.startedAt?.toISOString() || null,
          createdAt: inUseLot.createdAt.toISOString(),
          updatedAt: inUseLot.updatedAt.toISOString()
        }],
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        lastUsed: product.lastUsed?.toISOString() || null,
        currentProductLots: undefined
      }

      return formattedProduct
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: '商品の追加に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; productId: string }> | { id: string; productId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await context.params
    const { id: storeId, productId } = resolvedParams
    
    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    
    // 古いPOLISHタイプを新しいPOLISH_COLORに変換
    let productType = body.type;
    if (productType === 'POLISH') {
      productType = 'POLISH_COLOR';
    }
    
    // isLiquidとuseColorPickerのデフォルト値を設定
    const isLiquid = body.isLiquid ?? ['POLISH_COLOR', 'GEL_COLOR', 'GEL_BASE', 'GEL_TOP', 'GEL_REMOVER'].includes(productType);
    const useColorPicker = body.useColorPicker ?? ['POLISH_COLOR', 'GEL_COLOR'].includes(productType);

    const result = await prisma.$transaction(async (tx) => {
      // 更新前の商品情報を取得
      const oldProduct = await tx.product.findUnique({
        where: { id: productId }
      })

      if (!oldProduct) {
        throw new Error('商品が見つかりません')
      }

      // 商品の更新
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          brand: body.brand,
          productName: body.productName,
          colorCode: body.colorCode,
          colorName: body.colorName,
          type: productType,
          price: body.price,
          capacity: body.capacity,
          capacityUnit: body.capacityUnit,
          averageUsePerService: body.averageUsePerService,
          minStockAlert: body.minStockAlert,
          recommendedAlertPercentage: body.recommendedAlertPercentage,
          isLiquid,
          useColorPicker,
        }
      })

      // アクティビティログの記録
      await tx.activity.create({
        data: {
          userId: session.user.id,
          type: 'PRODUCT_UPDATE',
          action: '商品更新',
          metadata: {
            productName: product.productName,
            brand: product.brand,
            updates: {
              // 更新された項目のみを記録
              ...(oldProduct.brand !== product.brand && { brand: { old: oldProduct.brand, new: product.brand } }),
              ...(oldProduct.productName !== product.productName && { productName: { old: oldProduct.productName, new: product.productName } }),
              ...(oldProduct.colorName !== product.colorName && { colorName: { old: oldProduct.colorName, new: product.colorName } }),
              ...(oldProduct.price !== product.price && { price: { old: oldProduct.price, new: product.price } }),
              ...(oldProduct.capacity !== product.capacity && { capacity: { old: oldProduct.capacity, new: product.capacity } }),
              ...(oldProduct.capacityUnit !== product.capacityUnit && { capacityUnit: { old: oldProduct.capacityUnit, new: product.capacityUnit } })
            }
          }
        }
      })

      // 更新後の商品データを整形して返却
      return {
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        lastUsed: product.lastUsed?.toISOString() || null
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '商品の更新に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; productId: string }> | { id: string; productId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await context.params
    const { id: storeId, productId } = resolvedParams
    
    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 削除する商品の情報を取得
      const product = await tx.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        throw new Error('商品が見つかりません')
      }

      // まず関連する使用記録とロットを削除
      await tx.relatedProductUsage.deleteMany({
        where: { productId }
      })

      await tx.usage.deleteMany({
        where: { productId }
      })

      await tx.productLot.deleteMany({
        where: { productId }
      })

      // 商品の削除
      await tx.product.delete({
        where: { id: productId }
      })

      // アクティビティログの記録
      await tx.activity.create({
        data: {
          userId: session.user.id,
          type: 'PRODUCT_DELETE',
          action: '商品削除',
          metadata: {
            productName: product.productName,
            brand: product.brand,
            type: product.type,
            colorName: product.colorName,
            deletedAt: new Date().toISOString()
          }
        }
      })

      return {
        success: true,
        message: '商品を削除しました',
        deletedProduct: {
          ...product,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
          lastUsed: product.lastUsed?.toISOString() || null
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '商品の削除に失敗しました' },
      { status: 500 }
    )
  }
}