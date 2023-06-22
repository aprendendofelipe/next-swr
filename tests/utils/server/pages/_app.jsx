import { RevalidateProvider } from 'next-swr';

function MyApp({ Component, pageProps }) {
  const swrConfig = pageProps.swr;

  return (
    <RevalidateProvider swr={swrConfig}>
      <Component {...pageProps} />
    </RevalidateProvider>
  );
}

export default MyApp;
