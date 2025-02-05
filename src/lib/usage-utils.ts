// src/lib/usage-utils.ts
import type { Product, ProductLot } from '@/types/api'

export function calculateRemainingPercentage(
  product: Product,
  lot: ProductLot
): number | null {
  if (!product.capacity || !lot.currentAmount) return null;
  return Math.round((lot.currentAmount / product.capacity) * 100);
}

export function getStockStatus(product: Product) {
  const inUseLot = product.lots?.find(lot => lot.isInUse);
  
  return {
    inStock: product.lotQuantity, // 未使用の在庫数
    inUse: inUseLot ? {
      currentAmount: inUseLot.currentAmount,
      remainingPercentage: calculateRemainingPercentage(product, inUseLot),
      startedAt: inUseLot.startedAt
    } : null,
    total: product.totalQuantity,
    status: getStatusColor(product, inUseLot)
  };
}

function getStatusColor(product: Product, inUseLot?: ProductLot) {
  if (product.lotQuantity > product.minStockAlert) return 'success';
  if (!inUseLot) return 'error';
  
  const percentage = calculateRemainingPercentage(product, inUseLot);
  if (!percentage) return 'error';
  
  if (percentage > 50) return 'warning';
  return 'error';
}