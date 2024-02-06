import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRevalidate } from 'next-swr';
import { useEffect, useState } from 'react';

export const myGetStaticPaths = () => {
  return {
    paths: [
      {
        params: {
          slug: [
            '1', // revalidate
            '10_000', // refreshInterval
            '_', // dedupingInterval
            'true', // revalidateOnMount
            'true', // revalidateOnFocus
            'true', // revalidateIfStale
          ],
        },
      },
    ],
    fallback: 'blocking',
  };
};

export const myGetStaticProps = async (ctx) => {
  const randomNumber = Math.random();
  const revalidate = parseInt(ctx.params?.slug?.[0]);
  const refreshInterval = parseInt(ctx.params?.slug?.[1]);
  const dedupingInterval = parseInt(ctx.params?.slug?.[2]);

  const swr = JSON.parse(
    JSON.stringify({
      refreshInterval: refreshInterval > 0 ? refreshInterval : undefined,
      dedupingInterval: dedupingInterval < 20_000 ? dedupingInterval : undefined,
      revalidateOnMount: parseBoolean(ctx.params?.slug?.[3]),
      revalidateOnFocus: parseBoolean(ctx.params?.slug?.[4]),
      revalidateIfStale: parseBoolean(ctx.params?.slug?.[5]),
    }),
  );

  return {
    props: {
      ctx: JSON.parse(JSON.stringify(ctx)),
      randomNumber: randomNumber,
      timestamp: Date.now(),
    },
    revalidate: revalidate < 20 ? revalidate : undefined,
    swr,
  };
};

export function MyPage(props) {
  const [localProps, setLocalProps] = useRevalidate(props);
  const [time, setTime] = useState(props.timestamp);
  const { asPath, push, reload, replace } = useRouter();
  const nextPath = asPath.replace(/\/./, '/' + (parseInt(asPath.match(/\/./)?.[0]?.[1]) + 1));
  const lastPath = asPath.replace(/\/./, '/' + (parseInt(asPath.match(/\/./)?.[0]?.[1]) - 1));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div style={{ padding: '1rem 2rem 0' }}>
        <nav style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <Link href="/"> Home </Link>
          <Link href="https://github.com/aprendendofelipe/next-swr"> GitHub </Link>
          <Link href="https://www.npmjs.com/package/next-swr"> npm </Link>
        </nav>

        <h1>next-swr</h1>
        <p>Revalidate stale data in Next.js</p>
        <h2>Dynamic Routes Test Page</h2>
        <h3 style={{ wordWrap: 'break-word' }}>{`Route: ${asPath}`}</h3>
        <h4 style={{ wordWrap: 'break-word' }}>
          Pathname config:
          /[revalidate]/[refreshInterval]/[dedupingInterval]/[revalidateOnMount]/[revalidateOnFocus]/[revalidateIfStale]
        </h4>
        <h3>{`Current: ${new Date(time).toJSON()}`}</h3>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem',
        }}
      >
        <div style={{ border: '1px solid black', padding: '1rem', minWidth: '320px' }}>
          <h2>Server</h2>
          <h3>{`Random: ${props.randomNumber}`}</h3>
          <h3>{new Date(props.timestamp).toJSON()}</h3>
          <h4>
            <pre>{JSON.stringify({ props }, null, 2)}</pre>
          </h4>
          <p>
            <button
              onClick={() => {
                fetch('/api/isr', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    path: asPath,
                  }),
                });
              }}
            >
              Regenerate Page (ISR)
            </button>
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Link href={lastPath} prefetch={false}>
              Link {lastPath}
            </Link>

            <Link href={nextPath} prefetch={false}>
              Link {nextPath}
            </Link>

            <Link href={'/1'} prefetch={false}>
              {'/1 prefetch false'}
            </Link>

            <Link href={'/2'}>{'/2 prefetch true'}</Link>

            <button onClick={() => push(asPath)}>push</button>
            <button onClick={() => push(asPath, undefined, { unstable_skipClientCache: true })}>
              push skipClientCache
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => replace(asPath)}>replace</button>
            <button onClick={() => replace(asPath, undefined, { unstable_skipClientCache: true })}>
              replace skipClientCache
            </button>
            <button onClick={() => reload()}>reload</button>
          </div>
        </div>

        <div style={{ border: '1px solid black', padding: '1rem', minWidth: '320px' }}>
          <h2>next-swr / useRevalidate</h2>
          <h3>{`Random: ${localProps.randomNumber}`}</h3>
          <h3>{new Date(localProps.timestamp).toJSON()}</h3>
          <h4>
            <pre>{JSON.stringify({ localProps }, null, 2)}</pre>
          </h4>
          <button onClick={() => setLocalProps({ ...localProps, timestamp: Date.now(), randomNumber: Math.random() })}>
            Set new local data
          </button>
        </div>
      </div>
    </>
  );
}

function parseBoolean(value) {
  if (value === 'true' || value === '1') {
    return true;
  } else if (value === 'false' || value === '0') {
    return false;
  } else {
    return undefined;
  }
}
