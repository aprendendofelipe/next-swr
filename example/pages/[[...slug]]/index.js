import { getStaticPropsRevalidate } from 'next-swr';

import { myGetStaticPaths, myGetStaticProps, MyPage } from '/components/CustomForTests';

export default function Page(props) {
  return <MyPage {...props} />;
}

export const getStaticPaths = myGetStaticPaths;

export const getStaticProps = getStaticPropsRevalidate(myGetStaticProps);
