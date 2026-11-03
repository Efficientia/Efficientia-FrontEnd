import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseAsyncActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseAsyncActionReturn<T, P extends unknown[]> extends AsyncState<T> {
  execute: (...args: P) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook customizado para encapsular chamadas assíncronas da API.
 * Controla os estados de carregamento (loading), sucesso e erro.
 * Atende ao requisito EFFICIENTI-331.
 */
export function useAsyncAction<T, P extends unknown[]>(
  action: (...args: P) => Promise<T>,
  options?: UseAsyncActionOptions<T>
): UseAsyncActionReturn<T, P> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const isMountedRef = useRef(true);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setState({
        data: null,
        error: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      try {
        const result = await action(...args);
        if (isMountedRef.current) {
          setState({
            data: result,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false,
          });
          optionsRef.current?.onSuccess?.(result);
        }
        return result;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro inesperado na operação assíncrona.';

        if (isMountedRef.current) {
          setState({
            data: null,
            error: errorMessage,
            isLoading: false,
            isSuccess: false,
            isError: true,
          });
          optionsRef.current?.onError?.(errorMessage);
        }
        return null;
      }
    },
    [action]
  );

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState({
        data: null,
        error: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
      });
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export default useAsyncAction;
