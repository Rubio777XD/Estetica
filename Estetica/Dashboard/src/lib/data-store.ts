import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type QueryKey = string;

type ListenerEvent = { type: 'invalidate' | 'update' };
type Listener = (event: ListenerEvent) => void;

const cache = new Map<QueryKey, unknown>();
const listeners = new Map<QueryKey, Set<Listener>>();
const inflight = new Map<QueryKey, Promise<unknown>>();

function getListeners(key: QueryKey) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

function notify(key: QueryKey, event: ListenerEvent) {
  const set = listeners.get(key);
  if (!set) return;
  for (const listener of Array.from(set)) {
    listener(event);
  }
}

export function setQueryData<T>(key: QueryKey, updater: T | ((prev: T | undefined) => T | undefined)) {
  const current = cache.get(key) as T | undefined;
  const nextValue = typeof updater === 'function' ? (updater as (prev: T | undefined) => T | undefined)(current) : updater;
  if (typeof nextValue !== 'undefined') {
    cache.set(key, nextValue);
  } else {
    cache.delete(key);
  }
  notify(key, { type: 'update' });
}

export function invalidateQuery(keys: QueryKey | QueryKey[]) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    notify(key, { type: 'invalidate' });
  }
}

export interface UseApiQueryState<T> {
  data: T | undefined;
  error: unknown;
  status: 'idle' | 'loading' | 'success' | 'error';
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

interface UseApiQueryOptions {
  skip?: boolean;
}

export function useApiQuery<T>(key: QueryKey, fetcher: () => Promise<T>, options?: UseApiQueryOptions) {
  const skip = options?.skip ?? false;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const getCachedState = useCallback((): UseApiQueryState<T> => {
    if (cache.has(key)) {
      return {
        data: cache.get(key) as T,
        error: undefined,
        status: 'success',
        isLoading: false,
        isError: false,
        isSuccess: true,
      };
    }
    return {
      data: undefined,
      error: undefined,
      status: skip ? 'idle' : 'loading',
      isLoading: !skip,
      isError: false,
      isSuccess: false,
    };
  }, [key, skip]);

  const [state, setState] = useState<UseApiQueryState<T>>(getCachedState);
  const keyRef = useRef<QueryKey>(key);

  const execute = useCallback(async (): Promise<T> => {
    if (skip) {
      throw new Error('Query is skipped');
    }
    let promise = inflight.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = fetcherRef.current().then((value) => {
        cache.set(key, value);
        return value;
      });
      inflight.set(key, promise);
    }
    try {
      const result = await promise;
      return result;
    } finally {
      inflight.delete(key);
    }
  }, [key, skip]);

  const refetch = useCallback(async () => {
    if (skip) return;
    setState((prev) => ({ ...prev, status: 'loading', isLoading: true, isError: false }));
    try {
      const data = await execute();
      setState({
        data,
        error: undefined,
        status: 'success',
        isLoading: false,
        isError: false,
        isSuccess: true,
      });
    } catch (error) {
      if (skip) return;
      setState({
        data: cache.get(key) as T | undefined,
        error,
        status: 'error',
        isLoading: false,
        isError: true,
        isSuccess: false,
      });
    }
  }, [execute, key, skip]);

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setState(getCachedState());
    }
  }, [getCachedState, key]);

  useEffect(() => {
    if (!skip && state.status === 'loading' && !inflight.has(key)) {
      refetch();
    }
  }, [key, refetch, skip, state.status]);

  useEffect(() => {
    if (skip) return () => undefined;
    const listener: Listener = (event) => {
      if (event.type === 'invalidate') {
        refetch();
      } else if (event.type === 'update') {
        setState((prev) => ({
          ...prev,
          data: cache.get(key) as T | undefined,
          status: cache.has(key) ? 'success' : prev.status,
          isSuccess: cache.has(key) ? true : prev.isSuccess,
        }));
      }
    };
    const set = getListeners(key);
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        listeners.delete(key);
      }
    };
  }, [key, refetch, skip]);

  const setData = useCallback(
    (updater: T | ((prev: T | undefined) => T | undefined)) => {
      setQueryData<T>(key, updater);
    },
    [key]
  );

  return useMemo(
    () => ({
      ...state,
      refetch,
      setData,
    }),
    [state, refetch, setData]
  );
}

export function useApiMutation<TVariables, TResult>(
  action: (variables: TVariables) => Promise<TResult>,
  options?: {
    onMutate?: (variables: TVariables) => void | (() => void);
    onSuccess?: (result: TResult, variables: TVariables) => void;
    onError?: (error: unknown, variables: TVariables) => void;
    onSettled?: (variables: TVariables) => void;
  }
) {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const mutate = useCallback(
    async (variables: TVariables) => {
      if (isLoading) return undefined;
      let rollback: void | (() => void);
      try {
        setLoading(true);
        setError(undefined);
        rollback = options?.onMutate?.(variables);
        const result = await action(variables);
        options?.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        setError(err);
        if (rollback) {
          rollback();
        }
        options?.onError?.(err, variables);
        throw err;
      } finally {
        setLoading(false);
        options?.onSettled?.(variables);
      }
    },
    [action, isLoading, options]
  );

  return { mutate, isLoading, error };
}
