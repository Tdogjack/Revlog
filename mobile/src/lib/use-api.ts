import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { api, errorMessage } from "@/lib/api";

// Loads each time the screen comes into view, so saved edits show on return.
// A null path waits, for screens that only sometimes need the data.
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, error, reload };
}
