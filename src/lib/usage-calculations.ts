// src/lib/usage-calculations.ts
import type { NailLength, ServiceType } from '@/types/api';

export interface UsageCalculation {
  mainAmount: number;
  defaultAmount: number;  // デフォルト値を保持
  relatedAmounts: {
    productId: string;
    amount: number;
    defaultAmount: number;  // 関連商品のデフォルト値
  }[];
  isCustom: boolean;  // カスタム値かどうかのフラグ
}

export interface UsageCalculationOptions {
  customMainAmount?: number;
  customRelatedAmounts?: { productId: string; amount: number; }[];
  designVariant?: string;
}

export function calculateUsageAmounts(
  serviceType: ServiceType,
  nailLength: NailLength,
  options?: UsageCalculationOptions,
  customRate?: (base: number, length: NailLength) => number
): UsageCalculation {
  const getLengthRate = (length: NailLength): number => {
    switch (length) {
      case 'SHORT': return serviceType.shortLengthRate;
      case 'MEDIUM': return serviceType.mediumLengthRate;
      case 'LONG': return serviceType.longLengthRate;
    }
  };

  const calculateRate = customRate || 
    ((base: number, length: NailLength) => (getLengthRate(length) / 100) * base);

  // デザインファクターの計算
  const designFactor = calculateDesignFactor(serviceType, options?.designVariant);

  // デフォルト値の計算
  const defaultMainAmount = calculateRate(serviceType.defaultUsageAmount, nailLength) * designFactor;

  // メイン商品の使用量（カスタム値かデフォルト値）
  const mainAmount = options?.customMainAmount !== undefined 
    ? options.customMainAmount 
    : defaultMainAmount;

  // 関連商品の計算
  const relatedAmounts = serviceType.serviceTypeProducts
    .filter(stp => stp.isRequired)
    .sort((a, b) => a.order - b.order)
    .map(stp => {
      const defaultAmount = calculateRate(stp.usageAmount, nailLength) * designFactor;
      const customAmount = options?.customRelatedAmounts?.find(
        cra => cra.productId === stp.productId
      )?.amount;

      return {
        productId: stp.productId,
        defaultAmount,
        amount: customAmount !== undefined ? customAmount : defaultAmount
      };
    });

  return {
    mainAmount,
    defaultAmount: defaultMainAmount,
    relatedAmounts,
    isCustom: options?.customMainAmount !== undefined || 
              options?.customRelatedAmounts !== undefined
  };
}

function calculateDesignFactor(
  serviceType: ServiceType,
  designVariant?: string
): number {
  if (!designVariant || !serviceType.designUsageRate) {
    return 1;
  }

  const designFactors = {
    BASIC: 1,
    FRENCH: 1.2,
    ART: serviceType.designUsageRate
  };

  return designFactors[designVariant as keyof typeof designFactors] || 1;
}