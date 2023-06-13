import { GetStaticPropsResult } from 'next/types';

export type Swr = {
  expires?: number;
  dedupingInterval?: number;
  refreshInterval?: number | ((props: any) => number);
  revalidateIfStale?: boolean;
  revalidateOnMount?: boolean;
  revalidateOnFocus?: boolean;
  swrPath?: string;
  revalidate_f?: number;
  times?: { offset: number; latency: number };
  time?: number;
};

export type Props = any & {
  swr?: Swr;
};

export type GetStaticPropsSwr = GetStaticPropsResult<Props> & {
  props: Props;
  swr: Swr;
};

export type Timer = ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
