import { act, renderHook } from '@testing-library/react';

import { RevalidateProvider, useRevalidate } from 'src';
import { Swr } from 'src/types';

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
    it('should update state when setState is called', () => {
      const props = { key: 'value' };
      const { result } = renderHook(() => useRevalidate(props));

      expect(result.current[0]).toEqual(props);

      const newState = { key: 'newValue' };
      act(() => {
        result.current[1](newState);
      });

      expect(result.current[0]).toEqual(newState);
    });

    it('should update state when props change', async () => {
      const props = { key: 'value' };
      const { result, rerender } = renderHook(({ props }) => useRevalidate(props), { initialProps: { props } });

      expect(result.current[0]).toEqual(props);

      const newProps = { key: 'newValue' };
      rerender({ props: newProps });

      expect(result.current[0]).toEqual(newProps);
    });

    it('should update state when props change after setState', async () => {
      const props = { key: 'firstProps' };
      const { result, rerender } = renderHook(({ props }) => useRevalidate(props), {
        initialProps: { props },
      });

      expect(result.current[0]).toEqual(props);

      const newProps = { key: 'secondProps' };
      const localState = { key: 'localState' };

      act(() => {
        result.current[1](localState);
      });

      expect(result.current[0]).toEqual(localState);

      rerender({ props: newProps });

      expect(result.current[0]).toEqual(newProps);
    });
  });

  describe('with context', () => {
    describe('with time', () => {
      it('should update state when setState is called', () => {
        const props = { key: 'value' };
        const { result } = renderHook(() => useRevalidate(props), { wrapper: createWrapper() });

        expect(result.current[0]).toEqual(props);

        const newState = { key: 'newValue' };
        act(() => {
          result.current[1](newState);
        });

        expect(result.current[0]).toEqual(newState);
      });

      it('should update state when props change', async () => {
        const props = { key: 'value' };
        const { result, rerender } = renderHook(({ props }) => useRevalidate(props), {
          wrapper: createWrapper(),
          initialProps: { props },
        });

        expect(result.current[0]).toEqual(props);

        const newProps = { key: 'newValue' };
        rerender({ props: newProps });

        expect(result.current[0]).toEqual(newProps);
      });

      it('should update state when server props are newer', () => {
        const props = { key: 'firstProps' };
        const { result, rerender } = renderHook(({ props }) => useRevalidate(props), {
          wrapper: createWrapper(),
          initialProps: { props },
        });

        expect(result.current[0]).toEqual(props);

        const newProps = { key: 'secondProps' };
        const localState = { key: 'localState' };

        act(() => {
          result.current[1](localState);
        });

        expect(result.current[0]).toEqual(localState);

        rerender({ props: newProps });

        expect(result.current[0]).toEqual(newProps);
      });

      it('should not update state when local props are newer', () => {
        const props = { key: 'firstProps' };
        const { result, rerender } = renderHook(({ props }) => useRevalidate(props), {
          wrapper: createWrapper(Date.parse('2022-01-01T12:00:00.000Z')),
          initialProps: { props },
        });

        expect(result.current[0]).toEqual(props);

        const newProps = { key: 'secondProps' };
        const localState = { key: 'localState' };

        jest.useFakeTimers({
          now: Date.parse('2022-01-01T12:02:00.000Z'),
          advanceTimers: true,
        });

        act(() => {
          result.current[1](localState);
        });

        expect(result.current[0]).toEqual(localState);

        rerender({ props: newProps });

        expect(result.current[0]).toEqual(localState);

        jest.useRealTimers();
      });
    });

    describe('without time', () => {
      it('should update state when setState is called', () => {
        const props = { key: 'value' };
        const { result } = renderHook(() => useRevalidate(props), { wrapper: createWrapper('undefined') });

        expect(result.current[0]).toEqual(props);

        const newState = { key: 'newValue' };
        act(() => {
          result.current[1](newState);
        });

        expect(result.current[0]).toEqual(newState);
      });

      it('should update state when props change', async () => {
        const props = { key: 'value' };
        const { result, rerender } = renderHook(({ props }) => useRevalidate(props), {
          wrapper: createWrapper('undefined'),
          initialProps: { props },
        });

        expect(result.current[0]).toEqual(props);

        const newProps = { key: 'newValue' };
        rerender({ props: newProps });

        expect(result.current[0]).toEqual(newProps);
      });

      it('should update state when server props are newer', () => {
        const props = { key: 'firstProps' };
        const { result, rerender } = renderHook(({ props }) => useRevalidate(props), {
          wrapper: createWrapper('undefined'),
          initialProps: { props },
        });

        expect(result.current[0]).toEqual(props);

        const newProps = { key: 'secondProps' };
        const localState = { key: 'localState' };

        act(() => {
          result.current[1](localState);
        });

        expect(result.current[0]).toEqual(localState);

        rerender({ props: newProps });

        expect(result.current[0]).toEqual(newProps);
      });
    });
  });

  describe('with offset set to 0', () => {
    it('should not update state when local props are newer', () => {
      const props = { key: 'firstProps' };
      const { result, rerender } = renderHook(({ props }) => useRevalidate(props), {
        wrapper: createWrapper(Date.parse('2022-01-01T12:00:00.000Z'), { offset: 0, latency: 0 }),
        initialProps: { props },
      });

      expect(result.current[0]).toEqual(props);

      const newProps = { key: 'secondProps' };
      const localState = { key: 'localState' };

      jest.useFakeTimers({
        now: Date.parse('2022-01-01T12:02:00.000Z'),
        advanceTimers: true,
      });

      act(() => {
        result.current[1](localState);
      });

      expect(result.current[0]).toEqual(localState);

      rerender({ props: newProps });

      expect(result.current[0]).toEqual(localState);

      jest.useRealTimers();
    });
  });
});
