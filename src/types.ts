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
  times?: { offset: number; latency?: number; firstLoad?: boolean };
};

export type Props = { [key: string]: unknown } & { swr?: Swr };

export type GetStaticPropsSwr = GetStaticPropsResult<Props> & {
  props?: Props;
  swr?: Swr;
};

export type UseRevalidateResult = [Props, (newState: Props | ((props: Props) => Props)) => void];

export type UseTimesResult = {
  time?: number;
  offset?: number;
  latency?: number;
  firstLoad?: boolean;
};
