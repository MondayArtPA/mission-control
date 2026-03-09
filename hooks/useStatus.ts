import { useCallback, useEffect, useState } from "react";
import type { MissionControlStatusPayload } from "@/types/status";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UseMissionStatusReturn {
  status: MissionControlStatusPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMissionStatus(pollInterval = 5000): UseMissionStatusReturn {
  const [status, setStatus] = useState<MissionControlStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/status");
      const payload: ApiResponse<MissionControlStatusPayload> = await response.json();

      if (!payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to fetch mission status");
      }

      setStatus(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = window.setInterval(fetchStatus, pollInterval);
    return () => window.clearInterval(interval);
  }, [fetchStatus, pollInterval]);

  return { status, loading, error, refresh: fetchStatus };
}
