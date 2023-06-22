import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Swr } from './types';

export function useRefresh(config: Swr) {
  const [isHardRefreshing, setIsHardRefreshing] = useState(false);
  const [isSoftRefreshing, setIsSoftRefreshing] = useState(false);
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  const [revalidationAttempt, setRevalidationAttempt] = useState(0);
  const [refreshTimer, setRefreshTimer] = useState<undefined | NodeJS.Timeout>();
  const router = useRouter();
  const [path, setPath] = useState(router.asPath);
  const { expires, times } = config;

  useEffect(() => {
    setRevalidationAttempt(0);
    setPath(router.asPath);
  }, [router.asPath]);

  useEffect(() => {
    function routeChangeStart(url: string) {
      if (url === path) return;
      clearTimeout(refreshTimer);
      setIsRouteChanging(true);
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
  }, [path, refreshTimer, router.events]);

  function refresh({ delay = 0, revalidateCache = true } = {}) {
    if (isRouteChanging) return;
    if (isHardRefreshing) return;
    if (isSoftRefreshing && !revalidateCache) return;
    if (!expires) return;
    if (expires + (times?.offset || 60) > Date.now()) return;

    setRefreshTimer((timeout) => {
      clearTimeout(timeout);

      return setTimeout(async () => {
        if (revalidateCache) {
          setIsHardRefreshing(true);
          setIsSoftRefreshing(false);

          await router.replace(router.asPath, undefined, {
            unstable_skipClientCache: true,
            scroll: false,
          });

          setIsHardRefreshing(false);
        } else {
          setIsSoftRefreshing(true);

          await router.prefetch(router.asPath, undefined, {
            unstable_skipClientCache: true,
          });

          await router.replace(router.asPath, undefined, { scroll: false });

          setIsSoftRefreshing(false);
        }

        setRevalidationAttempt((count) => count + 1);
      }, delay);
    });
  }

  return {
    path,
    refresh,
    revalidationAttempt,
  };
}
