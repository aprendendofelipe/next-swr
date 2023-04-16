# Revalidate stale data in Next.js

Inspired by [Vercel/swr](https://www.npmjs.com/package/swr), but no API needed, as it revalidates data through static pages.

Only one api call per session is needed to synchronize local and remote clocks. We recommend using the middleware.

# Quickstart

## Install

```
  npm install next-swr
```

## Usage

```js
// _app file
import { useRevalidate } from 'next-swr'

function App({ Component, pageProps }) {
  useRevalidate(pageProps) // Optional
  return <Component {...pageProps} />
}
```

```js
// middleware
import { middlewareClock } from 'next-swr'

export const config = { matcher: ['/swr'] }

export const middleware = middlewareClock(async () = > { ... });
```

```js
// page files
import { getStaticPropsRevalidate, useRevalidate } from 'next-swr'

function Page({ swr, ...props }) {
  useRevalidate({ swr }) // Only if not in _app file
  return <Component {...props} />
}

export const getStaticProps = getStaticPropsRevalidate(async (ctx) => {
  // get data...
  return {
    props: { data },
    revalidate: 10
  }
)
```

It is better to put `useRevalidate` only in the \_app file as it reduces the number of renders and calls to the backend.

In this case, custom settings for each page can be returned via the swr object in getStaticProps.

## Parameters

- `swr`: an object of options for this hook

### Examples

```js
function Page({ swr, ...props }) {
  useRevalidate({ swr: {...swr, revalidateOnFocus: false } })
```

or

```js
export const getStaticProps = getStaticPropsRevalidate(async () => {
  // get data...
  return {
    props: { data },
    swr: {
      revalidate_f: 1,
      refreshInterval: 30_000
    }
  }
})
```

## Options

- `revalidateIfStale = true`: automatically revalidate even if there is stale data
- `revalidateOnMount = true`: enable or disable first automatic revalidation when component is mounted
- `revalidateOnFocus = true`: automatically revalidate when window gets focused
- `refreshInterval`:
  - Disabled by default: `refreshInterval = 0`
  - If set to a number, polling interval in milliseconds (min 50 ms)
  - If set to a function, the function will receive the latest data and should return the interval in milliseconds
- `dedupingInterval`: dedupe revalidate at least this time interval in milliseconds. Default is the elapsed time in the previous revalidation
- `revalidate_f`: sets a fixed revalidate on `getStaticProps`. The default is automatic, being `revalidate` plus the elapsed time in the previous revalidation
- `swrPath`: sets the endpoint to return the server time to synchronize expiration. Default is `/swr` which can be provided by `middlewareClock`

## Incompatibility

Not compatible with Next.js v13.3.0 due to a [bug.](https://github.com/vercel/next.js/issues/48302)

## License

The MIT License.
