import { useQuery } from '@tanstack/react-query';
import { fetchProductStatistics } from '@/lib/api-client';
import type { ProductStatisticsResponse } from '@/types/api';

interface UseProductStatisticsOptions {
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useProductStatistics(
  storeId: string,
  options: UseProductStatisticsOptions = {}
) {
  const {
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    page = 1,
    limit = 10,
    enabled = true
  } = options;

  return useQuery<ProductStatisticsResponse>({
    queryKey: ['productStatistics', storeId, year, month, page],
    queryFn: () => fetchProductStatistics(storeId, year, month, page, limit),
    enabled,
    staleTime: 1000 * 60 * 30, // 30分
    gcTime: 1000 * 60 * 60,    // 1時間
    retry: 1
  });
}