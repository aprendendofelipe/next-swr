import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useContext, useEffect, useRef, useState } from 'react';

import { RevalidateProvider } from 'src';
import useRefresh from 'src/hooks/useRefresh';
import { NextSwrContext } from 'src/Provider';

jest.mock('src/hooks/useRefresh', () => jest.fn());

const mockRefresh = jest.fn();
const mockFetch = jest.fn();

globalThis.fetch = mockFetch;

const Consumer = () => {
  const renderCountRef = useRef(0);
  const context = useContext(NextSwrContext);

  renderCountRef.current++;

  return (
    <>
      <p data-testid="context">{JSON.stringify(context)}</p>
      {typeof context.refreshInterval === 'function' && <p>{context.refreshInterval.toString()}</p>}
      <p data-testid="renderCount">{renderCountRef.current}</p>
    </>
  );
};

const defaultSwr = {
  revalidateIfStale: true,
  revalidateOnMount: true,
  revalidateOnFocus: true,
  refreshInterval: 0,
  swrPath: '/swr',
  time: 0,
  times: { offset: 60, latency: 500, firstLoad: true },
};

const customSwr = {
  revalidateIfStale: false,
  revalidateOnMount: false,
  revalidateOnFocus: false,
  refreshInterval: 0,
  dedupingInterval: 0,
  swrPath: '/custom',
  expires: 946684800,
  time: 1,
  times: { offset: 0, latency: 0 },
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
  delete process.env.NEXT_PUBLIC_HEAD_REQUESTS;

  (useRefresh as jest.Mock).mockReturnValue({
    path: '/',
    refresh: mockRefresh,
    revalidationAttempt: 0,
  });

  (fetch as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      json: () => Promise.resolve({ timestamp: Date.now() }),
    }),
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  delete process.env.NEXT_PUBLIC_VERCEL_ENV;
});

describe('Context Provider', () => {
  describe('Provide config', () => {
    it('should get default context values without provider', () => {
      render(<Consumer />);

      const target = screen.getByTestId('context');
      const context = JSON.parse(target.textContent || '');

      expect(context).toEqual(defaultSwr);
    });

    it('should get default context values', () => {
      render(
        <RevalidateProvider>
          <Consumer />
        </RevalidateProvider>,
      );

      const target = screen.getByTestId('context');
      const context = JSON.parse(target.textContent || '');

      expect(context).toEqual(defaultSwr);
    });

    it('should get custom context values', () => {
      render(
        <RevalidateProvider
          swr={{
            ...customSwr,
            dedupingInterval: 100,
            refreshInterval: 5000,
            times: { offset: 10, latency: 40 },
          }}
        >
          <Consumer />
        </RevalidateProvider>,
      );

      const target = screen.getByTestId('context');
      const context = JSON.parse(target.textContent || '');

      expect(context).toEqual({
        ...customSwr,
        dedupingInterval: 100,
        refreshInterval: 5000,
        times: { offset: 10, latency: 40, firstLoad: true },
      });
    });

    it('should get fallback "times"', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => Promise.reject('API is down'));

      const swr = {
        ...customSwr,
        dedupingInterval: 100,
        refreshInterval: 5000,
        times: { offset: 100, latency: 400 },
      };

      const { rerender } = render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(useRefresh).toHaveBeenCalledTimes(1));

      const context = screen.getByTestId('context');

      expect(JSON.parse(context.textContent || '')).toEqual({
        ...swr,
        times: { ...swr.times, firstLoad: true },
      });

      rerender(
        <RevalidateProvider swr={{ ...swr }}>
          <Consumer />
        </RevalidateProvider>,
      );

      expect(JSON.parse(context.textContent || '')).toEqual({
        ...swr,
        times: { offset: expect.any(Number), latency: expect.any(Number), firstLoad: false },
      });

      const lastCallArgs = (useRefresh as jest.Mock).mock.calls[1][0];
      expect(lastCallArgs.times.offset).toBeLessThanOrEqual(100);
      expect(lastCallArgs.times.latency).toBeLessThanOrEqual(400);
    });

    it('should get fallback "time"', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({}),
        }),
      );

      const swr = {
        ...customSwr,
        dedupingInterval: 100,
        refreshInterval: 5000,
        times: { offset: 10, latency: 40 },
      };

      const firstSwr = {
        ...swr,
        times: { ...swr.times, firstLoad: true },
      };

      const lastSwr = {
        ...swr,
        times: { offset: expect.any(Number), latency: expect.any(Number), firstLoad: false },
      };

      const { rerender } = render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      const context = screen.getByTestId('context');

      expect(JSON.parse(context.textContent || '')).toEqual(firstSwr);

      await waitFor(() => expect(useRefresh).toHaveBeenCalledTimes(1));

      expect(useRefresh).toHaveBeenCalledWith(firstSwr);

      rerender(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      expect(JSON.parse(context.textContent || '')).toEqual(lastSwr);

      expect(useRefresh).toHaveBeenLastCalledWith(lastSwr);

      const lastCallArgs = (useRefresh as jest.Mock).mock.calls[1][0];
      expect(lastCallArgs.times.offset).toBeLessThanOrEqual(5);
      expect(lastCallArgs.times.latency).toBeLessThanOrEqual(40);
    });

    it('should get times by API', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ timestamp: Date.now() - 150 }),
        }),
      );

      const swr = {
        ...customSwr,
        dedupingInterval: 100,
        refreshInterval: 5000,
        times: { offset: 10, latency: 40 },
      };

      const firstSwr = {
        ...swr,
        times: { ...swr.times, firstLoad: true },
      };

      const lastSwr = {
        ...swr,
        times: { offset: expect.any(Number), latency: expect.any(Number), firstLoad: false },
      };

      const { rerender } = render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      const context = screen.getByTestId('context');

      expect(JSON.parse(context.textContent || '')).toEqual(firstSwr);

      await waitFor(() => expect(useRefresh).toHaveBeenCalledTimes(1));

      expect(useRefresh).toHaveBeenCalledWith(firstSwr);

      rerender(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      expect(JSON.parse(context.textContent || '')).toEqual(lastSwr);

      expect(useRefresh).toHaveBeenLastCalledWith(lastSwr);

      const lastCallArgs = (useRefresh as jest.Mock).mock.calls[1][0];
      expect(lastCallArgs.times.offset).toBeGreaterThanOrEqual(150);
      expect(lastCallArgs.times.latency).toBeLessThanOrEqual(40);
    });

    it('should be able to set refreshInterval as a function', () => {
      render(
        <RevalidateProvider
          swr={{
            ...customSwr,
            dedupingInterval: 100,
            refreshInterval: () => 2000,
            times: { offset: 10, latency: 40 },
          }}
        >
          <Consumer />
        </RevalidateProvider>,
      );

      const target = screen.getByTestId('context');
      const context = JSON.parse(target.textContent || '');

      expect(context).toEqual({
        ...customSwr,
        dedupingInterval: 100,
        refreshInterval: undefined,
        times: { offset: 10, latency: 40, firstLoad: true },
      });
      expect(screen.getByText('()=>2000')).toBeInTheDocument();
    });

    it('should be able to change swr props', async () => {
      const swr = {
        ...customSwr,
        refreshInterval: 5000,
        times: { offset: 0, latency: 0, firstLoad: true },
      };

      const newSwr = {
        ...customSwr,
        expires: customSwr.expires + 1,
        refreshInterval: 3000,
      };

      const lastSwr = {
        ...newSwr,
        times: { offset: expect.any(Number), latency: expect.any(Number), firstLoad: false },
      };

      const { rerender } = render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      const renderCount = await screen.findByTestId('renderCount');
      const context = screen.getByTestId('context');

      expect(renderCount).toHaveTextContent('1');
      expect(useRefresh).toHaveBeenCalledWith(swr);
      expect(useRefresh).toHaveBeenCalledTimes(1);
      expect(JSON.parse(context.textContent || '')).toEqual({
        ...swr,
        times: { offset: expect.any(Number), latency: expect.any(Number), firstLoad: true },
      });

      rerender(
        <RevalidateProvider swr={newSwr}>
          <Consumer />
        </RevalidateProvider>,
      );

      expect(JSON.parse(context.textContent || '')).toEqual(lastSwr);
      expect(useRefresh).toHaveBeenLastCalledWith(lastSwr);
      expect(renderCount).toHaveTextContent('2');
    });
  });

  describe('Refresh Page', () => {
    it('should not refresh without revalidate or refreshInterval being enabled', async () => {
      render(
        <RevalidateProvider swr={customSwr}>
          <Consumer />
        </RevalidateProvider>,
      );

      const renderCount = await screen.findByTestId('renderCount');

      expect(renderCount).toHaveTextContent('1');
      expect(useRefresh).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledTimes(0);
    });

    it('should be able to refresh by revalidateOnMount (attempt 1)', async () => {
      const swr = {
        ...customSwr,
        revalidateOnMount: true,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      const renderCount = await screen.findByTestId('renderCount');

      await waitFor(() => expect(renderCount).toHaveTextContent('2'));

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should be able to refresh by revalidateOnMount (attempt 2)', async () => {
      (useRefresh as jest.Mock).mockReturnValue({
        path: '/',
        refresh: mockRefresh,
        revalidationAttempt: 1,
      });

      const swr = {
        ...customSwr,
        revalidateOnMount: true,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());

      expect(mockRefresh).toHaveBeenCalledWith({
        delay: expect.any(Number),
        skipRevalidateServerCache: true,
      });
    });

    it('should be able to refresh by revalidateOnMount (attempt 3)', async () => {
      (useRefresh as jest.Mock).mockReturnValue({
        path: '/',
        refresh: mockRefresh,
        revalidationAttempt: 2,
      });

      const swr = {
        ...customSwr,
        revalidateOnMount: true,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());

      expect(mockRefresh).toHaveBeenCalledWith({
        delay: expect.any(Number),
        skipRevalidateServerCache: true,
      });
    });

    it('should not be able to 4 attempts to refresh by revalidateOnMount', async () => {
      (useRefresh as jest.Mock).mockReturnValue({
        path: '/',
        refresh: mockRefresh,
        revalidationAttempt: 3,
      });

      const swr = {
        ...customSwr,
        revalidateOnMount: true,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      expect(useRefresh).toHaveBeenCalledTimes(2);
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should not be able to refresh by revalidateOnMount on dev mode', async () => {
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const swr = {
        ...customSwr,
        revalidateOnMount: true,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      process.env.NODE_ENV = nodeEnv;

      expect(useRefresh).toHaveBeenCalledTimes(2);
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should be able to to console.error on dev mode', async () => {
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      (fetch as jest.Mock).mockImplementationOnce(() => Promise.reject('API is down'));

      jest.spyOn(console, 'error').mockImplementationOnce(() => {
        // do nothing
      });

      render(
        <RevalidateProvider>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      process.env.NODE_ENV = nodeEnv;

      expect(console.error).toHaveBeenCalledWith('API is down');
    });

    it('should not be able to new attempts to refresh by revalidateOnMount without "expires"', async () => {
      (useRefresh as jest.Mock).mockReturnValue({
        path: '/',
        refresh: mockRefresh,
        revalidationAttempt: 1,
      });

      const swr = {
        ...customSwr,
        revalidateOnMount: true,
        expires: undefined,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(useRefresh).toHaveBeenCalledTimes(2);
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should not be able to new attempts to refresh by revalidateOnMount if not stale', async () => {
      (useRefresh as jest.Mock).mockReturnValue({
        path: '/',
        refresh: mockRefresh,
        revalidationAttempt: 1,
      });

      const swr = {
        ...customSwr,
        revalidateOnMount: true,
        expires: Date.now() + 60_000,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(useRefresh).toHaveBeenCalledTimes(2);
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should not be able to refresh by revalidateOnMount without "dedupingInterval"', async () => {
      const swr = {
        ...customSwr,
        revalidateOnMount: true,
        dedupingInterval: undefined,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(useRefresh).toHaveBeenCalledTimes(2);
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should revalidateOnMount wait for "times" values', async () => {
      (fetch as jest.Mock).mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          json: () => Promise.resolve({ timestamp: Date.now() - 150 }),
        };
      });

      const swr = {
        ...customSwr,
        revalidateOnMount: true,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      await waitFor(() => expect(useRefresh).toHaveBeenCalled());
      expect(mockRefresh).not.toHaveBeenCalled();
      await waitFor(() => expect(mockRefresh).toHaveBeenCalled(), { timeout: 150 });
    });

    it('should be able to refresh by refreshInterval', async () => {
      const swr = {
        ...customSwr,
        refreshInterval: 1,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      const renderCount = await screen.findByTestId('renderCount');

      expect(renderCount).toHaveTextContent('1');
      expect(mockRefresh).toHaveBeenCalledTimes(1);

      await waitFor(() => expect(mockRefresh.mock.calls.length).toBeGreaterThanOrEqual(2));
      expect(renderCount).toHaveTextContent('2');
    });

    it('should be able to refresh by revalidateOnFocus', async () => {
      const swr = {
        ...customSwr,
        revalidateOnFocus: true,
      };

      render(
        <RevalidateProvider swr={swr}>
          <Consumer />
        </RevalidateProvider>,
      );

      const renderCount = await screen.findByTestId('renderCount');

      expect(useRefresh).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledTimes(0);

      fireEvent.focus(window);

      expect(renderCount).toHaveTextContent('1');
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Fetcher', () => {
    const Fetcher = ({ input = '', init = {} }) => {
      const [response, setResponse] = useState<Response>();
      const [responseBody, setResponseBody] = useState<Response>();

      useEffect(() => {
        if (input)
          fetch(input, init)
            .then((resp) => {
              setResponse(resp);
              return resp.json();
            })
            .then((data) => setResponseBody(data));
      }, [input, init]);

      return (
        <>
          <p data-testid="response">{JSON.stringify(response)}</p>;
          {responseBody === null && <p data-testid="responseBody">null</p>}
        </>
      );
    };

    it('should be able to send non-HEAD method request ', async () => {
      const { rerender } = render(
        <RevalidateProvider>
          <Fetcher />
        </RevalidateProvider>,
      );

      rerender(
        <RevalidateProvider>
          <Fetcher
            input="/some-url"
            init={{
              method: 'GET',
              headers: { 'x-nextjs-data': '1' },
            }}
          />
        </RevalidateProvider>,
      );

      const target = await screen.findByTestId('response');

      expect(target).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith('/some-url', {
        method: 'GET',
        headers: { 'x-nextjs-data': '1' },
      });
    });

    it('should be able to send HEAD request if "x-nextjs-data" header is not present', async () => {
      const { rerender } = render(
        <RevalidateProvider>
          <Fetcher />
        </RevalidateProvider>,
      );

      rerender(
        <RevalidateProvider>
          <Fetcher
            input="/some-url"
            init={{
              method: 'HEAD',
              headers: { data: '1' },
            }}
          />
        </RevalidateProvider>,
      );

      const target = await screen.findByTestId('response');

      expect(target).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith('/some-url', {
        method: 'HEAD',
        headers: { data: '1' },
      });
    });

    it('should not be able to send HEAD request if "x-nextjs-data" header is present', async () => {
      const { rerender } = render(
        <RevalidateProvider>
          <Fetcher />
        </RevalidateProvider>,
      );

      rerender(
        <RevalidateProvider>
          <Fetcher
            input="/some-url"
            init={{
              method: 'HEAD',
              headers: { 'x-nextjs-data': '1' },
            }}
          />
        </RevalidateProvider>,
      );

      const target = await screen.findByTestId('response');
      const response = JSON.parse(target.textContent || '');
      const responseBody = screen.queryByTestId('responseBody');

      expect(responseBody).toHaveTextContent('null');
      expect(response).toEqual({ ok: true, status: 304, statusText: 'Not Modified' });

      expect(mockFetch).toHaveBeenCalledWith('/swr', undefined);
      expect(mockFetch).not.toHaveBeenCalledWith('/some-url', {
        method: 'HEAD',
        headers: expect.any(Headers),
      });
    });

    it('should be able to send HEAD request if NEXT_PUBLIC_HEAD_REQUESTS env is true', async () => {
      process.env.NEXT_PUBLIC_HEAD_REQUESTS = 'true';

      const { rerender } = render(
        <RevalidateProvider>
          <Fetcher />
        </RevalidateProvider>,
      );

      rerender(
        <RevalidateProvider>
          <Fetcher
            input="/some-url"
            init={{
              method: 'HEAD',
              headers: { 'x-nextjs-data': '1' },
            }}
          />
        </RevalidateProvider>,
      );

      const target = await screen.findByTestId('response');

      delete process.env.NEXT_PUBLIC_HEAD_REQUESTS;

      expect(target).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith('/some-url', {
        method: 'HEAD',
        headers: { 'x-nextjs-data': '1' },
      });
    });

    it('should be able to send HEAD request if NEXT_PUBLIC_VERCEL_ENV is not "production"', async () => {
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;

      const { rerender } = render(
        <RevalidateProvider>
          <Fetcher />
        </RevalidateProvider>,
      );

      rerender(
        <RevalidateProvider>
          <Fetcher
            input="/some-url"
            init={{
              method: 'HEAD',
              headers: { 'x-nextjs-data': '1' },
            }}
          />
        </RevalidateProvider>,
      );

      const target = await screen.findByTestId('response');

      delete process.env.NEXT_PUBLIC_HEAD_REQUESTS;

      expect(target).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith('/some-url', {
        method: 'HEAD',
        headers: { 'x-nextjs-data': '1' },
      });
    });
  });
});
