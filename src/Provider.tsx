import React, { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Props, Swr, Timer } from './types';
import { useRouter } from 'next/router';

const defaultTimes = { offset: 0, latency: 60 };
const defaultSwrPath = '/swr';

export const RevalidateContext = createContext<Swr>({});

let timeout: Timer;
let interval: Timer;
let refreshDelay: Timer;

export function RevalidateProvider({ children, swr, ...props }: PropsWithChildren<Props>) {
  const parentSwrConfig = useContext(RevalidateContext);
  const [times, setTimes] = useState({ ...defaultTimes, ...parentSwrConfig?.times, ...swr?.times });
  const [revalidationAttempt, setRevalidationAttempt] = useState(0);
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  const router = useRouter();

  const config = useMemo(() => {
    return {
      revalidateIfStale: true,
      revalidateOnMount: true,
      revalidateOnFocus: true,
      swrPath: defaultSwrPath,
      ...parentSwrConfig,
      ...swr,
      times,
    };
  }, [parentSwrConfig, swr, times]);

  const {
    expires,
    dedupingInterval,
    refreshInterval,
    revalidateIfStale,
    revalidateOnMount,
    revalidateOnFocus,
    swrPath,
  } = config;

  useEffect(() => {
    setTimeout(async () => {
      const startTime = Date.now();
      const response = await fetch(swrPath);
      const { timestamp } = await response.json();
      const now = Date.now();
      const offset = timestamp ? now - timestamp : 0;
      const latency = now - startTime;
      setTimes({ offset, latency });
    });
  }, [swrPath]);

  useEffect(() => {
    setRevalidationAttempt(0);

    function routeChangeStart(url: string) {
      if (url === router.asPath) return;
      setIsRouteChanging(true);
      clearTimeout(refreshDelay);
    }

    function routeChangeEnd() {
      setIsRouteChanging(false);
    }

    router.events.on('routeChangeStart', routeChangeStart);
    router.events.on('routeChangeComplete', routeChangeEnd);
    router.events.on('routeChangeError', routeChangeEnd);

    return () => {
      router.events.off('routeChangeStart', routeChangeStart);
      router.events.off('routeChangeComplete', routeChangeEnd);
      router.events.off('routeChangeError', routeChangeEnd);
    };
  }, [router.asPath, router.events]);

  useEffect(() => {
    clearTimeout(refreshDelay);
    clearInterval(interval);
    if (!expires || isRouteChanging) return;

    function refresh() {
      clearTimeout(refreshDelay);
      if (expires! + times.offset > Date.now()) return;
      refreshDelay = setTimeout(
        () =>
          router.replace(router.asPath, undefined, {
            unstable_skipClientCache: true,
            scroll: false,
          }),
        50
      );
    }

    if (refreshInterval) {
      if (typeof refreshInterval === 'number') {
        interval = setInterval(refresh, refreshInterval);
      }
      if (typeof refreshInterval === 'function') {
        interval = setInterval(refresh, refreshInterval(props));
      }
    }

    if (expires !== null && revalidateOnFocus) window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      clearTimeout(refreshDelay);
      clearInterval(interval);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRouteChanging, expires, props, refreshInterval, revalidateOnFocus, times]);

  useEffect(() => {
    clearTimeout(timeout);
    if (
      process.env.NODE_ENV === 'development' ||
      dedupingInterval === undefined ||
      expires === null ||
      expires + times.offset > Date.now() ||
      revalidationAttempt > 2 ||
      !revalidateIfStale ||
      isRouteChanging
    )
      return;

    if (revalidationAttempt === 0 && revalidateOnMount) {
      setRevalidationAttempt(1);
      router.replace(router.asPath, undefined, {
        unstable_skipClientCache: true,
        scroll: false,
      });
      return;
    }

    timeout = setTimeout(async () => {
      setRevalidationAttempt((count) => count + 1);
      await router.prefetch(router.asPath, undefined, {
        unstable_skipClientCache: true,
      });
      await router.replace(router.asPath, undefined, { scroll: false });
    }, (0.5 + revalidationAttempt) * (dedupingInterval + times.latency));

    return () => clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRouteChanging, router, times]);

  return <RevalidateContext.Provider value={config}>{children}</RevalidateContext.Provider>;
}
