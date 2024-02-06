import { GetStaticPropsContext } from 'next/types';

import { GetStaticPropsSwr } from 'src/types';

export default function getStaticPropsRevalidate(
  getStaticProps: (ctx: GetStaticPropsContext) => Promise<GetStaticPropsSwr>,
) {
  return async (ctx: GetStaticPropsContext) => {
    const startTime = Date.now();
    const { props, revalidate: _revalidate, swr, ...rest } = await getStaticProps(ctx);
    const { revalidate_f, dedupingInterval = 0, ...swrRest } = swr || {};
    const expires =
      typeof _revalidate === 'number' && _revalidate !== 0 ? (_revalidate * 1000 + Date.now()) * 2 - startTime : 0;
    const revalidationDuration = Date.now() - startTime;

    const revalidate = revalidate_f
      ? revalidate_f
      : typeof _revalidate === 'number' && _revalidate !== 0
        ? Math.floor(revalidationDuration / 1000 + _revalidate)
        : false;

    return {
      props: {
        swr: {
          expires,
          dedupingInterval: revalidationDuration + dedupingInterval,
          time: startTime,
          ...swrRest,
        },
        ...props,
      },
      revalidate,
      ...rest,
    };
  };
}
