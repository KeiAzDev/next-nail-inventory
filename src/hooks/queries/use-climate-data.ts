// src/hooks/queries/use-climate-data.ts
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { ClimateData } from "@/types/api";

interface LocationState {
  location: { lat: number; lon: number } | null;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
  debug?: DebugInfo;
}

interface DebugInfo {
  reason?: string;
  error?: unknown;
  accuracy?: number;
  timestamp?: number;
}

export type ClimateDataQueryResult = UseQueryResult<ClimateData, Error> & {
  locationState: LocationState;
};

export function useClimateData(): ClimateDataQueryResult {
  const [locationState, setLocationState] = useState<LocationState>({
    location: null,
    error: null,
    status: "idle",
  });

  useEffect(() => {
    const getLocation = async () => {
      if (!navigator.geolocation) {
        setLocationState({
          location: null,
          error: "お使いのブラウザは位置情報をサポートしていません",
          status: "error",
          debug: { reason: "geolocation_not_supported" },
        });
        return;
      }

      setLocationState((prev) => ({ ...prev, status: "loading" }));

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            const successCallback = (pos: GeolocationPosition) => {
              resolve(pos);
            };

            const errorCallback = (err: GeolocationPositionError) => {
              reject(err);
            };

            navigator.geolocation.getCurrentPosition(
              successCallback,
              errorCallback,
              options
            );
          }
        );

        setLocationState({
          location: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
          error: null,
          status: "success",
          debug: {
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
        });
      } catch (error) {
        let errorMessage = "位置情報の取得に失敗しました";
        const debugInfo: DebugInfo = { error };

        if (error instanceof GeolocationPositionError) {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "位置情報の利用が許可されていません。ブラウザの設定から位置情報の利用を許可してください。";
              debugInfo.reason = "permission_denied";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "現在位置を取得できません";
              debugInfo.reason = "position_unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "位置情報の取得がタイムアウトしました";
              debugInfo.reason = "timeout";
              break;
          }
        }

        setLocationState({
          location: null,
          error: errorMessage,
          status: "error",
          debug: debugInfo,
        });
      }
    };

    getLocation();
  }, []);

  const query = useQuery<ClimateData>({
    queryKey: [
      "climate",
      locationState.location?.lat,
      locationState.location?.lon,
    ],
    queryFn: async () => {
      if (!locationState.location) {
        throw new Error(locationState.error || "位置情報が利用できません");
      }

      const { lat, lon } = locationState.location;
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });

      const url = `/api/climate-data?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "不明なエラー" }));
        throw new Error(errorData.error || "気象データの取得に失敗しました");
      }

      return response.json();
    },
    enabled:
      locationState.status === "success" &&
      !!locationState.location?.lat &&
      !!locationState.location?.lon,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  return {
    ...query,
    locationState,
  };
}
