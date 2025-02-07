// src/hooks/queries/use-predictions.ts
import { useQuery } from '@tanstack/react-query';
import type { PredictionResult } from '@/lib/prediction/prediction-engine';

export interface PredictionResponse {
  predictions: (PredictionResult & {
    serviceTypeId: string;
    serviceName: string;
  })[];
  timestamp: string;
}

export function usePredictions(storeId: string | undefined) {
  return useQuery<PredictionResponse>({
    queryKey: ['predictions', storeId],
    queryFn: async () => {
      if (!storeId) {
        throw new Error('Store ID is required');
      }
      const response = await fetch(`/api/stores/${storeId}/predictions`);
      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }
      const data = await response.json();
      return data as PredictionResponse;
    },
    staleTime: 30 * 60 * 1000,  // 30分
    gcTime: 60 * 60 * 1000,     // 1時間
    enabled: !!storeId,         // storeIdが存在する場合のみクエリを実行
  });
}

export function useServiceTypePrediction(
  storeId: string | undefined,
  serviceTypeId: string | undefined
) {
  const { data, ...rest } = usePredictions(storeId);
  
  const prediction = serviceTypeId && data?.predictions.find(
    p => p.serviceTypeId === serviceTypeId
  );

  return {
    prediction,
    timestamp: data?.timestamp,
    ...rest
  };
}