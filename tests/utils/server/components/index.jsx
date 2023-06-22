import { getStaticPropsRevalidate, useRevalidate } from 'next-swr';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

export const getStaticPaths = () => {
  return {
    paths: [
      {
        params: {
          revalidate: '1',
          refreshInterval: '100',
          revalidateOnMount: 'true',
          revalidateOnFocus: 'true',
          revalidateIfStale: 'true',
        },
      },
    ],
    fallback: 'blocking',
  };
};

export const getStaticProps = getStaticPropsRevalidate(async (ctx) => {
  const randomNumber = Math.random();
  const revalidate = parseInt(ctx.params?.revalidate) || false;
  const swr = JSON.parse(
    JSON.stringify({
      refreshInterval: parseInt(ctx.params?.refreshInterval) || undefined,
      revalidateOnMount: parseBoolean(ctx.params?.revalidateOnMount),
      revalidateOnFocus: parseBoolean(ctx.params?.revalidateOnFocus),
      revalidateIfStale: parseBoolean(ctx.params?.revalidateIfStale),
    })
  );

  return {
    props: {
      ctx: JSON.parse(JSON.stringify(ctx)),
      randomNumber: randomNumber,
      timestamp: Date.now(),
    },
    revalidate,
    swr,
  };
});

export default function Page(props) {
  const [localProps, setLocalProps] = useRevalidate(props);
  const [time, setTime] = useState(props.timestamp);
  const router = useRouter();
  const path = router.asPath;

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
        <h3 style={{ wordWrap: 'break-word' }}>{`Route: ${path}`}</h3>
        <h4 style={{ wordWrap: 'break-word' }}>
          Pathname config: /[revalidate]/[refreshInterval]/[revalidateOnMount]/[revalidateOnFocus]/[revalidateIfStale]
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
                    path: path,
                  }),
                });
              }}
            >
              Regenerate Page (ISR)
            </button>
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Link href={path}>Link</Link>

            <button onClick={() => router.push(path)}>push</button>
            <button onClick={() => router.push(path, undefined, { unstable_skipClientCache: true })}>
              push skipClientCache
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => router.replace(path)}>replace</button>
            <button onClick={() => router.replace(path, undefined, { unstable_skipClientCache: true })}>
              replace skipClientCache
            </button>
            <button onClick={() => router.reload()}>reload</button>
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
