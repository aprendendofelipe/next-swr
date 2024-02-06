import { createContext, PropsWithChildren, useEffect, useRef, useState } from 'react';

import useRefresh from 'src/hooks/useRefresh';
import { Props, Swr } from 'src/types';

const defaultTimes = { offset: 60, latency: 500, firstLoad: true };
const defaultSwrPath = '/swr';
const defaultCdnPropagationTimeInMs = 200;

const defaultSwr = {
  revalidateIfStale: true,
  revalidateOnMount: true,
  revalidateOnFocus: true,
  refreshInterval: 0,
  dedupingInterval: undefined,
  swrPath: defaultSwrPath,
  expires: undefined,
  time: 0,
  times: defaultTimes,
};

export const NextSwrContext = createContext<Swr>(defaultSwr);

export default function RevalidateProvider({ children, swr, ...props }: PropsWithChildren<Props>) {
  const [times, setTimes] = useState({ ...defaultTimes, ...swr?.times });
  const cdnPropagationTimeRef = useRef(defaultCdnPropagationTimeInMs);
  const config = { ...defaultSwr, ...swr, times };
  const { path, refresh, revalidationAttempt } = useRefresh(config);
  const { dedupingInterval, expires, refreshInterval, revalidateOnFocus, revalidateOnMount, swrPath } = config;

  useEffect(setCustomFetch, []);

  // set "times" on first load
  useEffect(() => {
    setTimeout(async () => {
      let serverTime;
      const startTime = Date.now();

      try {
        const response = await fetch(swrPath);
        const body = await response.json();
        serverTime = body.timestamp || startTime;
      } catch (error) {
        serverTime = startTime;

        if (process.env.NODE_ENV === 'development') console.error(error);
      }

      const now = Date.now();
      const offset = now - serverTime;
      const latency = now - startTime;

      setTimes({ offset, latency, firstLoad: false });
    });
  }, [swrPath]);

  // revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const onFocusListenerCallback = () => refresh();

    window.addEventListener('focus', onFocusListenerCallback);

    return () => window.removeEventListener('focus', onFocusListenerCallback);
  }, [refresh, revalidateOnFocus]);

  // refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    let interval: NodeJS.Timeout;

    if (typeof refreshInterval === 'number') {
      interval = setInterval(refresh, refreshInterval);
    }

    if (typeof refreshInterval === 'function') {
      interval = setInterval(refresh, refreshInterval(props));
    }

    return () => clearInterval(interval);
  }, [path, props, refresh, refreshInterval]);

  // revalidate on mount
  useEffect(() => {
    if (!revalidateOnMount) return;
    if (process.env.NODE_ENV === 'development') return;
    if (dedupingInterval === undefined) return;
    if (revalidationAttempt > 2) return;
    if (times.firstLoad) return;

    if (revalidationAttempt === 0) {
      refresh();
      return;
    }

    if (!expires) return;
    if (expires + times.offset > Date.now()) return;

    if (revalidationAttempt === 2 && cdnPropagationTimeRef.current < 16 * defaultCdnPropagationTimeInMs)
      cdnPropagationTimeRef.current *= 2;

    refresh({
      delay: (0.5 + revalidationAttempt) * dedupingInterval + times.latency + cdnPropagationTimeRef.current,
      skipRevalidateServerCache: true,
    });
  }, [dedupingInterval, expires, path, refresh, revalidateOnMount, revalidationAttempt, times]);

  return <NextSwrContext.Provider value={config}>{children}</NextSwrContext.Provider>;
}

type NextHeaders = { [key: string]: string };

function setCustomFetch() {
  if (process.env.NEXT_PUBLIC_HEAD_REQUESTS) return;
  if (!['production', 'preview'].includes(process.env.NEXT_PUBLIC_VERCEL_ENV || '')) return;

  const originalFetch = globalThis.fetch;

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // HEAD requests are used by Next.js to revalidate the cache
    // But Vercel does not propagate revalidation data to CDN for HEAD requests
    // So this just causes a waste of lambda and database resources
    // Next.js ignores the HEAD response, so we can return a false response
    if (init?.method === 'HEAD' && (init.headers as NextHeaders)?.['x-nextjs-data'] === '1') {
      return {
        ok: true,
        status: 304,
        statusText: 'Not Modified',
        json: async () => null,
      } as Response;
    }
    return await originalFetch(input, init);
  };
  globalThis.fetch = customFetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}
