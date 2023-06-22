import React, { useContext } from 'react';
import { RevalidateContext, RevalidateProvider } from '../../src/Provider';
import { render, screen } from '@testing-library/react';

jest.mock('next/router', () => require('next-router-mock'));

const Consumer = () => {
  const context = useContext(RevalidateContext);
  return <div>{JSON.stringify(context)}</div>;
};

describe('Context Provider', () => {
  it('default context values without provider', () => {
    render(<Consumer />);
    expect(
      screen.getByText(
        '{"expires":0,"refreshInterval":0,"revalidateIfStale":true,"revalidateOnFocus":true,"revalidateOnMount":true,"swrPath":"/swr","time":0,"times":{"offset":60,"latency":100}}'
      )
    ).toBeInTheDocument();
  });

  it('default context values', () => {
    render(
      <RevalidateProvider>
        <Consumer />
      </RevalidateProvider>
    );

    expect(
      screen.getByText(
        '{"expires":0,"revalidateIfStale":true,"revalidateOnMount":true,"revalidateOnFocus":true,"swrPath":"/swr","times":{"offset":60,"latency":100}}'
      )
    ).toBeInTheDocument();
  });

  it('custom context values', () => {
    render(
      <RevalidateProvider
        swr={{
          expires: 946684800,
          revalidateIfStale: false,
          revalidateOnMount: false,
          revalidateOnFocus: false,
          dedupingInterval: 100,
          refreshInterval: 500,
          swrPath: '/custom',
          times: { offset: 10, latency: 40 },
        }}
      >
        <Consumer />
      </RevalidateProvider>
    );

    expect(
      screen.getByText(
        '{"expires":946684800,"revalidateIfStale":false,"revalidateOnMount":false,"revalidateOnFocus":false,"swrPath":"/custom","dedupingInterval":100,"refreshInterval":500,"times":{"offset":10,"latency":40}}'
      )
    ).toBeInTheDocument();
  });
});
