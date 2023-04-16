import { GetStaticPropsContext } from 'next/types';
import { GetStaticPropsSwr } from './types';

export function getStaticPropsRevalidate(getStaticProps: (ctx: GetStaticPropsContext) => Promise<GetStaticPropsSwr>) {
  return async (ctx: GetStaticPropsContext) => {
    const startTime = Date.now();
    const { props, revalidate: _revalidate, swr, ...rest } = await getStaticProps(ctx);
    const { revalidate_f, ...swrRest } = swr || {};
    const expires =
      typeof _revalidate === 'number' && _revalidate !== 0
        ? (_revalidate * 1000 + Date.now()) * 2 - startTime
        : undefined;
    const dedupingInterval = Date.now() - startTime;

    const revalidate = revalidate_f
      ? revalidate_f
      : typeof _revalidate === 'number' && _revalidate !== 0
      ? Math.floor(dedupingInterval / 1000 + _revalidate)
      : false;

    return {
      props: {
        swr: {
          expires,
          dedupingInterval,
          ...swrRest,
        },
        ...props,
      },
      revalidate,
      ...rest,
    };
  };
}
