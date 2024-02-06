import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

import { Swr } from 'src/types';

export default function useRefresh({ dedupingInterval, expires, revalidateIfStale, times }: Swr) {
  const { asPath, events, prefetch, replace } = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const isHardRefreshingRef = useRef(false);
  const isSoftRefreshingRef = useRef(false);
  const dedupingExpiration = useRef(0);
  const [revalidationAttempt, setRevalidationAttempt] = useState(0);

  useEffect(() => {
    setRevalidationAttempt(0);
    dedupingExpiration.current = 0;
    isHardRefreshingRef.current = false;
    isSoftRefreshingRef.current = false;

    function routeChangeStart(url: string) {
      clearTimeout(refreshTimerRef.current);
      if (url === asPath) return;
      isHardRefreshingRef.current = true;
    }

    function routeChangeError() {
      isHardRefreshingRef.current = false;
    }

    events.on('routeChangeStart', routeChangeStart);
    events.on('routeChangeError', routeChangeError);

    return () => {
      clearTimeout(refreshTimerRef.current);
      events.off('routeChangeStart', routeChangeStart);
      events.off('routeChangeError', routeChangeError);
    };
  }, [asPath, events]);

  function refresh({ delay = 0, skipRevalidateServerCache = false } = {}) {
    if (dedupingInterval === undefined) return;
    if (isHardRefreshingRef.current) return;
    if (isSoftRefreshingRef.current && skipRevalidateServerCache) return;
    if (revalidateIfStale && (!expires || expires + (times?.offset || 60) > Date.now())) return;
    if (dedupingExpiration.current > Date.now()) return;

    dedupingExpiration.current = Date.now() + dedupingInterval;

    clearTimeout(refreshTimerRef.current);

    if (skipRevalidateServerCache) {
      isSoftRefreshingRef.current = true;
    } else {
      isHardRefreshingRef.current = true;
      isSoftRefreshingRef.current = false;
    }

    refreshTimerRef.current = setTimeout(async () => {
      if (skipRevalidateServerCache) {
        await prefetch(asPath, undefined, {
          unstable_skipClientCache: true,
        });

        await replace(asPath, undefined, { scroll: false });

        isSoftRefreshingRef.current = false;
      } else {
        if (!times?.firstLoad) {
          await replace(asPath, undefined, {
            unstable_skipClientCache: true,
            scroll: false,
          });
        }

        isHardRefreshingRef.current = false;
      }

      if (revalidationAttempt < 3) setRevalidationAttempt((attempt) => attempt + 1);
    }, delay);
  }

  return {
    path: asPath,
    refresh,
    revalidationAttempt,
  };
}
