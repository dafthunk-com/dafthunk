import useSWRInfinite, {
  SWRInfiniteConfiguration,
  SWRInfiniteKeyLoader,
  SWRInfiniteFetcher,
} from "swr/infinite";
import { useRef, useEffect } from "react";

export interface UsePaginationOptions<Data = any, Error = any>
  extends SWRInfiniteConfiguration<Data[], Error> {
  pageSize: number;
}

export interface UsePaginationResult<Data = any, Error = any> {
  paginatedData: Data[];
  error?: Error;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  mutate: (
    data?:
      | Data[][]
      | Promise<Data[][] | undefined>
      | ((
          currentData: Data[][] | undefined
        ) => Promise<Data[][] | undefined> | Data[][] | undefined),
    opts?: any // SWR.MutatorOptions<Data[][]> | boolean - using any for simplicity here
  ) => Promise<Data[][] | undefined>;
  size: number;
  setSize: (
    size: number | ((_size: number) => number)
  ) => Promise<Data[][] | undefined>;
  isReachingEnd: boolean;
  isEmpty: boolean;
  observerTargetRef: React.RefObject<HTMLDivElement | null>;
}

export function useInfinatePagination<Data = any, Error = any>(
  getKey: SWRInfiniteKeyLoader<Data[], string | null>,
  fetcher: SWRInfiniteFetcher<Data[], any>,
  options: UsePaginationOptions<Data, Error>
): UsePaginationResult<Data, Error> {
  const { pageSize, ...swrOptions } = options;
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  const swrGetKey: SWRInfiniteKeyLoader<Data[], string | null> = (
    index,
    previousPageData
  ) => getKey(index, previousPageData);

  const { data, error, isLoading, mutate, size, setSize, isValidating } =
    useSWRInfinite<Data[], Error>(swrGetKey, fetcher, swrOptions);

  const paginatedData: Data[] = data ? data.flat() : [];
  const isInitialLoading = isLoading;
  const isLoadingMore = isValidating && !isLoading;

  // Determine if the end has been reached
  // This happens if the last fetched page was empty or had fewer items than PAGE_SIZE
  const lastPage = data ? data[data.length - 1] : undefined;
  const isReachingEnd = lastPage
    ? lastPage.length < pageSize || lastPage.length === 0
    : false;

  const isEmpty = !isInitialLoading && !error && paginatedData.length === 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !isLoadingMore &&
          !isReachingEnd &&
          !isInitialLoading
        ) {
          setSize((s) => s + 1);
        }
      },
      { threshold: 0.5 } // Using a common default, can be made configurable if needed
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [
    isLoadingMore,
    isReachingEnd,
    isInitialLoading,
    setSize,
    size,
    observerTargetRef,
  ]);

  return {
    paginatedData,
    error,
    isInitialLoading,
    isLoadingMore,
    mutate,
    size,
    setSize,
    isReachingEnd,
    isEmpty,
    observerTargetRef,
  };
}
