import { act, renderHook, waitFor } from '@testing-library/react';

import useRefresh from 'src/hooks/useRefresh';
import { mockRouter } from 'tests/utils/mocks/next-router';

const config = {
  dedupingInterval: 0,
  expires: 1,
  revalidateIfStale: true,
  times: { offset: 0, latency: 0 },
};

describe('useRefresh', () => {
  it('should initialize state', () => {
    const { result } = renderHook(() => useRefresh(config));

    expect(result.current.path).toBe('/mock-path');
    expect(result.current.refresh).toBeInstanceOf(Function);
    expect(result.current.revalidationAttempt).toBe(0);
  });

  it('should start and stop listening to route change events', () => {
    const { unmount } = renderHook(() => useRefresh(config));

    expect(mockRouter.events.on).toHaveBeenCalledTimes(2);
    expect(mockRouter.events.on).toHaveBeenCalledWith('routeChangeStart', expect.any(Function));
    expect(mockRouter.events.on).toHaveBeenCalledWith('routeChangeError', expect.any(Function));

    expect(mockRouter.events.off).toHaveBeenCalledTimes(0);

    unmount();

    expect(mockRouter.events.on).toHaveBeenCalledTimes(2);

    expect(mockRouter.events.off).toHaveBeenCalledTimes(2);
    expect(mockRouter.events.off).toHaveBeenCalledWith('routeChangeStart', expect.any(Function));
    expect(mockRouter.events.off).toHaveBeenCalledWith('routeChangeError', expect.any(Function));

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should hard refresh the page', async () => {
    const { result } = renderHook(() => useRefresh(config));

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
    expect(mockRouter.replace).toHaveBeenCalledWith('/mock-path', undefined, {
      scroll: false,
      unstable_skipClientCache: true,
    });
  });

  it('should soft refresh the page', async () => {
    const { result } = renderHook(() => useRefresh(config));

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);

    await act(async () => {
      result.current.refresh({ skipRevalidateServerCache: true });
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });

    expect(mockRouter.replace).toHaveBeenCalledWith('/mock-path', undefined, {
      scroll: false,
    });
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(1);
    expect(mockRouter.prefetch).toHaveBeenCalledWith('/mock-path', undefined, {
      unstable_skipClientCache: true,
    });
  });

  it('should hard refresh after delay', async () => {
    const { result } = renderHook(() => useRefresh(config));

    await act(async () => {
      jest.useFakeTimers();
      result.current.refresh({ delay: 70 });
      jest.advanceTimersByTime(60);
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);

    await waitFor(() => {
      jest.advanceTimersByTime(10);
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
    jest.useRealTimers();

    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should soft refresh after delay', async () => {
    const { result } = renderHook(() => useRefresh(config));

    act(() => {
      jest.useFakeTimers();
      result.current.refresh({ delay: 80, skipRevalidateServerCache: true });
      jest.advanceTimersByTime(70);
    });

    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
    expect(mockRouter.replace).toHaveBeenCalledTimes(0);

    await waitFor(() => {
      jest.advanceTimersByTime(10);
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
    jest.useRealTimers();

    expect(mockRouter.prefetch).toHaveBeenCalledTimes(1);
  });

  it('should not refresh after unmount', async () => {
    const { result, unmount } = renderHook(() => useRefresh(config));

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);

    await act(async () => {
      result.current.refresh({ skipRevalidateServerCache: true });
      unmount();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should not refresh the page if route is already changing', async () => {
    const { result } = renderHook(() => useRefresh(config));

    const routerEventsOn = mockRouter.events.on as unknown as jest.Mock;
    const routeChangeStart = routerEventsOn.mock.calls[0][1];

    await act(async () => {
      routeChangeStart('/other-path');
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should be able to refresh page if routeChangeStart is emitted with same path', async () => {
    const { result } = renderHook(() => useRefresh(config));

    const routerEventsOn = mockRouter.events.on as unknown as jest.Mock;
    const routeChangeStart = routerEventsOn.mock.calls[0][1];

    await act(async () => {
      routeChangeStart('/mock-path');
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
  });

  it('should not refresh the page with delay if the route starts to change', async () => {
    const { result } = renderHook(() => useRefresh(config));

    await act(async () => {
      result.current.refresh({ delay: 90 });
      mockRouter.push('/new-path');
    });

    expect(mockRouter.asPath).toBe('/new-path');
    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should be able to refresh page after route change', async () => {
    const { result } = renderHook(() => useRefresh(config));

    await act(async () => {
      mockRouter.push('/new-path');
    });

    expect(mockRouter.asPath).toBe('/new-path');
    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
    expect(mockRouter.asPath).toBe('/new-path');
  });

  it('should be able to refresh page after route change with error', async () => {
    const { result } = renderHook(() => useRefresh(config));

    const routerEventsOn = mockRouter.events.on as unknown as jest.Mock;
    const routeChangeStart = routerEventsOn.mock.calls[0][1];
    const routeChangeError = routerEventsOn.mock.calls[1][1];

    await act(async () => {
      routeChangeStart();
      routeChangeError();
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
  });

  it('should deduplicate refresh if already hard refreshing', async () => {
    const { result } = renderHook(() => useRefresh(config));

    await act(async () => {
      result.current.refresh();
      result.current.refresh();
      result.current.refresh({ skipRevalidateServerCache: true });
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should deduplicate refresh if already soft refreshing and not revalidating cache', async () => {
    const { result } = renderHook(() => useRefresh(config));

    await act(async () => {
      result.current.refresh({ skipRevalidateServerCache: true });
      result.current.refresh({ skipRevalidateServerCache: true });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(1);
  });

  it('should hard refresh the page if already soft refreshing', async () => {
    const { result } = renderHook(() => useRefresh(config));

    await act(async () => {
      result.current.refresh({ skipRevalidateServerCache: true });
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should not refresh the page if dedupingInterval is not set', async () => {
    const { result } = renderHook(() => useRefresh({ ...config, dedupingInterval: undefined }));

    await act(async () => {
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should not refresh the page if is deduping', async () => {
    const { result } = renderHook(() => useRefresh({ ...config, dedupingInterval: 100 }));

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should increment revalidation attempt count', async () => {
    const { result } = renderHook(() => useRefresh(config));

    expect(result.current.revalidationAttempt).toBe(0);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });

    expect(result.current.revalidationAttempt).toBe(1);
  });

  it('should not refresh the page if expires is not set', async () => {
    const { result } = renderHook(() => useRefresh({ ...config, expires: undefined }));

    await act(async () => {
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should not refresh the page if expires is set to 0', async () => {
    const { result } = renderHook(() => useRefresh({ ...config, expires: 0 }));

    await act(async () => {
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  it('should not refresh the page if not expired', async () => {
    const { result } = renderHook(() => useRefresh({ ...config, expires: Date.now() + 1000 }));

    await act(async () => {
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(0);
    expect(mockRouter.prefetch).toHaveBeenCalledTimes(0);
  });

  describe('revalidateIfStale set to false', () => {
    it('should refresh the page even expires is not set', async () => {
      const { result } = renderHook(() => useRefresh({ ...config, expires: undefined, revalidateIfStale: false }));

      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      });
    });

    it('should refresh the page even expires is set to 0', async () => {
      const { result } = renderHook(() => useRefresh({ ...config, expires: 0, revalidateIfStale: false }));

      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      });
    });

    it('should refresh the page even if not expired', async () => {
      const { result } = renderHook(() =>
        useRefresh({ ...config, expires: Date.now() + 1000, revalidateIfStale: false }),
      );

      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      });
    });
  });
});
