// src/lib/usage-calculations.ts
import type { NailLength, ServiceType } from '@/types/api';

export interface UsageCalculation {
  mainAmount: number;
  relatedAmounts: { productId: string; amount: number; }[];
}

export function calculateUsageAmounts(
  serviceType: ServiceType,
  nailLength: NailLength,
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

  const mainAmount = calculateRate(serviceType.defaultUsageAmount, nailLength);

  const relatedAmounts = serviceType.serviceTypeProducts
    .filter(stp => stp.isRequired)
    .sort((a, b) => a.order - b.order)
    .map(stp => ({
      productId: stp.productId,
      amount: calculateRate(stp.usageAmount, nailLength)
    }));

  return { mainAmount, relatedAmounts };
}