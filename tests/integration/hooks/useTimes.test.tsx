import { renderHook, waitFor } from '@testing-library/react';

import { RevalidateProvider, useTimes } from 'src';
import { Swr } from 'src/types';

const defaultTimes = { time: 0, offset: 60, latency: 500, firstLoad: true };

const createWrapper = (timestamp?: number | string, times?: { offset: number; latency: number }) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    let time: number | undefined;

    if (typeof timestamp !== 'string') {
      time = timestamp || Date.now();
    }
    const swr: Swr = { time, times };

    return <RevalidateProvider swr={swr}>{children}</RevalidateProvider>;
  };

describe('useRevalidate', () => {
  describe('without context', () => {
    it('should get default "times"', () => {
      const { result } = renderHook(() => useTimes());

      expect(result.current).toEqual(defaultTimes);
    });
  });

  describe('with context', () => {
    it('should get default times', () => {
      const { result } = renderHook(() => useTimes(), { wrapper: createWrapper('undefined') });

      expect(result.current).toEqual(defaultTimes);
    });

    it('should get "time" from swr config', () => {
      const timestampBefore = Date.now();
      const { result } = renderHook(() => useTimes(), { wrapper: createWrapper() });

      expect(result.current.offset).toBe(defaultTimes.offset);
      expect(result.current.latency).toBe(defaultTimes.latency);
      expect(result.current.firstLoad).toBe(defaultTimes.firstLoad);
      expect(result.current.time).toBeGreaterThanOrEqual(timestampBefore);
      expect(result.current.time).toBeLessThanOrEqual(Date.now());
    });

    it('should get "times" from swr config', () => {
      const timestamp = Date.parse('2022-01-01T12:00:00.000Z');
      const { result } = renderHook(() => useTimes(), {
        wrapper: createWrapper(timestamp, { offset: 10, latency: 20 }),
      });

      expect(result.current.offset).toBe(10);
      expect(result.current.latency).toBe(20);
      expect(result.current.firstLoad).toBe(true);
      expect(result.current.time).toBe(timestamp);
    });

    it('should update "times" from Provider', async () => {
      const timestamp = Date.parse('2022-01-01T12:00:00.000Z');
      const { result } = renderHook(() => useTimes(), {
        wrapper: createWrapper(timestamp, { offset: 10, latency: 20 }),
      });

      expect(result.current.offset).toBe(10);
      expect(result.current.latency).toBe(20);
      expect(result.current.firstLoad).toBe(true);
      expect(result.current.time).toBe(timestamp);

      await waitFor(() => {
        expect(result.current.firstLoad).toBe(false);
      });

      expect(result.current.time).toBe(timestamp);
      expect(result.current.offset).toBeLessThanOrEqual(5);
      expect(result.current.latency).toBeLessThanOrEqual(5);
    });
  });
});
