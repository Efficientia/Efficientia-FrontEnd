import { useCallback, useEffect, useState } from 'react';
import { normalizeApiError, type ApiRequestError } from '../services/api/errors';

export interface FetchDataState<T> {
  data: T | null;
  error: ApiRequestError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

interface FetchDataSnapshot<T> {
  data: T | null;
  error: ApiRequestError | null;
  isSuccess: boolean;
  completedFetcher: Fetcher<T> | null;
  completedVersion: number;
}

export interface UseFetchDataReturn<T> extends FetchDataState<T> {
  refetch: () => void;
}

export function useFetchData<T>(fetcher: Fetcher<T>): UseFetchDataReturn<T> {
  const [state, setState] = useState<FetchDataSnapshot<T>>({
    data: null,
    error: null,
    isSuccess: false,
    completedFetcher: null,
    completedVersion: -1,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, error: null, isSuccess: true, completedFetcher: fetcher, completedVersion: requestVersion });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            data: null,
            error: normalizeApiError(error),
            isSuccess: false,
            completedFetcher: fetcher,
            completedVersion: requestVersion,
          });
        }
      });

    return () => controller.abort();
  }, [fetcher, requestVersion]);

  const refetch = useCallback(() => setRequestVersion((version) => version + 1), []);
  const isLoading = state.completedFetcher !== fetcher || state.completedVersion !== requestVersion;
  return {
    data: state.data,
    error: isLoading ? null : state.error,
    isLoading,
    isSuccess: !isLoading && state.isSuccess,
    isError: !isLoading && state.error !== null,
    refetch,
  };
}

export default useFetchData;
