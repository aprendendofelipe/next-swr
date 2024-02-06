import { RevalidateProvider } from 'next-swr';

function MyApp({ Component, pageProps }) {
  const customSwrConfig = {
    // custom config for all pages
    // revalidateIfStale: false,
    // revalidateOnMount: false,
    // revalidateOnFocus: false,
    // refreshInterval: 10_000,
    // swrPath: '/api/clock',

    // custom config for specific page
    ...pageProps.swr,
  };

  return (
    // default swr config or custom only for specific page
    // <RevalidateProvider {...pageProps}>

    // custom swr config
    <RevalidateProvider swr={customSwrConfig}>
      <Component {...pageProps} />
    </RevalidateProvider>
  );
}

export default MyApp;
