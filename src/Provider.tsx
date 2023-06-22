import React, { PropsWithChildren, createContext, useEffect, useMemo, useState } from 'react';
import { Props, Swr } from './types';
import { useRefresh } from './useRefresh';

const defaultTimes = { offset: 60, latency: 100 };
const defaultSwrPath = '/swr';

export const RevalidateContext = createContext<Swr>({
  dedupingInterval: undefined,
  expires: 0,
  refreshInterval: 0,
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnMount: true,
  swrPath: defaultSwrPath,
  time: 0,
  times: defaultTimes,
});

export function RevalidateProvider({ children, swr, ...props }: PropsWithChildren<Props>) {
  const [times, setTimes] = useState({ ...defaultTimes, ...swr?.times });
  const [isNewFocus, setIsNewFocus] = useState(false);

  const config = useMemo(() => {
    return {
      expires: 0,
      revalidateIfStale: true,
      revalidateOnMount: true,
      revalidateOnFocus: true,
      swrPath: defaultSwrPath,
      ...swr,
      times,
    };
  }, [swr, times]);

  const { path, refresh, revalidationAttempt } = useRefresh(config);

  const { dedupingInterval, refreshInterval, revalidateIfStale, revalidateOnMount, revalidateOnFocus, swrPath } =
    config;

  useEffect(() => {
    setTimeout(async () => {
      let serverTime;
      const startTime = Date.now();

      try {
        const response = await fetch(swrPath);
        const body = await response.json();
        serverTime = body.timestamp;
      } catch (error) {
        serverTime = startTime;

        if (process.env.NODE_ENV === 'development') console.error(error);
      }

      const now = Date.now();
      const offset = now - serverTime;
      const latency = now - startTime;

      setTimes({ offset, latency });
    });
  }, [swrPath]);

  useEffect(() => {
    if (!revalidateOnFocus) return;

    const onFocusListenerCallback = () => setIsNewFocus(true);
    window.addEventListener('focus', onFocusListenerCallback);

    return () => window.removeEventListener('focus', onFocusListenerCallback);
  }, [revalidateOnFocus]);

  useEffect(() => {
    if (revalidateOnFocus && isNewFocus) {
      refresh();
      setIsNewFocus(false);
    }
  }, [isNewFocus, refresh, revalidateOnFocus]);

  useEffect(() => {
    if (!refreshInterval) return;

    let interval: NodeJS.Timer;

    if (typeof refreshInterval === 'number') {
      interval = setInterval(refresh, refreshInterval);
    }

    if (typeof refreshInterval === 'function') {
      interval = setInterval(refresh, refreshInterval(props));
    }

    return () => clearInterval(interval);
  }, [path, props, refresh, refreshInterval]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || dedupingInterval === undefined) return;

    if (revalidationAttempt === 0 && revalidateOnMount) {
      refresh();
      return;
    }

    if (revalidationAttempt < 3 && revalidateIfStale) {
      refresh({
        delay: (0.5 + revalidationAttempt) * (dedupingInterval + times.latency),
        revalidateCache: false,
      });
    }
  }, [dedupingInterval, path, refresh, revalidateIfStale, revalidateOnMount, revalidationAttempt, times]);

  return <RevalidateContext.Provider value={config}>{children}</RevalidateContext.Provider>;
}
