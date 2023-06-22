import { GetStaticPropsResult } from 'next/types';

export type Swr = {
  dedupingInterval?: number;
  expires?: number;
  refreshInterval?: number | ((props: Props) => number);
  revalidateIfStale?: boolean;
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
  revalidate_f?: number;
  swrPath?: string;
  time?: number;
  times?: { offset: number; latency: number };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Props = any & {
  swr?: Swr;
};

export type GetStaticPropsSwr = GetStaticPropsResult<Props> & {
  props?: Props;
  swr?: Swr;
};
