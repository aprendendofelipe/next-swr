# Revalidate stale data in Next.js

Inspired by [Vercel/swr](https://www.npmjs.com/package/swr), but no API needed, as it revalidates data through static pages.

Only one api call per session is needed to synchronize local and remote clocks. We recommend using the middleware.

# Quickstart

## Install

```
  npm i next-swr
```

## Usage

```js
// _app file
import { RevalidateProvider } from 'next-swr';

function App({ Component, pageProps }) {
  const swrConfig = pageProps.swr;

  return (
    <RevalidateProvider swr={swrConfig}>
      <Component {...pageProps} />
    </RevalidateProvider>
  );
}
```

```js
// middleware
import clock from 'next-swr/clock';

export const config = { matcher: ['/swr', '/others-paths'] };

export const middleware = clock(optionalMiddlewareFunction);
```

```js
// page files
import { getStaticPropsRevalidate } from 'next-swr'

function Page({ data }) {
  return <Component {...data} />
}

export const getStaticProps = getStaticPropsRevalidate(async (ctx) => {
  // get data...
  return {
    props: { data },
    revalidate: 10
  }
)
```

```js
// Optimistic component files
import { useRevalidate } from 'next-swr';

function Component(props) {
  const [state, setState] = useRevalidate(props.state);

  return (
    <div>
      <h1>{state}</h1>
      <button
        onClick={async () => {
          const newState = await getOrUpdateState();
          setState(newState);
        }}
      >
        Use most current state
      </button>
    </div>
  );
}
```

## Parameters

- `swr`: an object of options for next-swr

### Custom config per page

```js
export const getStaticProps = getStaticPropsRevalidate(async () => {
  // get data...
  return {
    props: { data },
    swr: {
      revalidate_f: 1,
      refreshInterval: 30_000,
      revalidateOnFocus: false,
    },
  };
});
```

## Options

- `revalidateIfStale = true`: revalidate only if there is stale data
- `revalidateOnMount = true`: enable or disable first automatic revalidation when page is mounted
- `revalidateOnFocus = true`: automatically revalidate when window gets focused
- `refreshInterval`:
  - Disabled by default: `refreshInterval = 0`
  - If set to a number, polling interval in milliseconds.
  - If set to a function, the function will receive the latest props and should return the interval in milliseconds.
- `dedupingInterval`: dedupe revalidate at least this time interval in milliseconds. Default is the elapsed time in the previous revalidation
- `revalidate_f`: sets a fixed revalidate on `getStaticProps`. The default is automatic, being `revalidate` plus the elapsed time in the previous revalidation
- `swrPath`: sets the endpoint to return the server time to synchronize expiration. Default is `/swr` which can be provided by `next-swr/clock`

## License

The MIT License.
