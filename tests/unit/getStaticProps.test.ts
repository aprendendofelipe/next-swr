import { getStaticPropsRevalidate } from 'src';

describe('getStaticPropsRevalidate', () => {
  it('should return the correct props and revalidate value when swr is not provided', async () => {
    const mockGetStaticProps = jest.fn().mockResolvedValue({
      props: { foo: 'bar' },
      revalidate: 60,
    });

    const getStaticProps = getStaticPropsRevalidate(mockGetStaticProps);
    const ctx = { params: { id: '1' } };
    const result = await getStaticProps(ctx);

    expect(mockGetStaticProps).toHaveBeenCalledWith(ctx);
    expect(result).toStrictEqual({
      props: {
        swr: {
          expires: expect.any(Number),
          dedupingInterval: expect.any(Number),
          time: expect.any(Number),
        },
        foo: 'bar',
      },
      revalidate: 60,
    });
    expect(result.props.swr.expires).toBeGreaterThan(Date.now());
    expect(result.props.swr.dedupingInterval).toBeLessThan(10);
    expect(result.props.swr.time).toBeLessThanOrEqual(Date.now());
  });

  it('should return the fixed revalidate value', async () => {
    const mockGetStaticProps = jest.fn().mockResolvedValue({
      props: { foo: 'bar' },
      revalidate: 60,
      swr: { revalidate_f: 10 },
    });

    const getStaticProps = getStaticPropsRevalidate(mockGetStaticProps);
    const ctx = { params: { id: '1' } };
    const result = await getStaticProps(ctx);

    expect(result).toStrictEqual({
      props: {
        swr: {
          expires: expect.any(Number),
          dedupingInterval: expect.any(Number),
          time: expect.any(Number),
        },
        foo: 'bar',
      },
      revalidate: 10,
    });
  });

  it('should return expires = 0 and revalidate = false', async () => {
    const mockGetStaticProps = jest.fn().mockResolvedValue({
      props: { foo: 'bar' },
    });

    const getStaticProps = getStaticPropsRevalidate(mockGetStaticProps);
    const ctx = { params: { id: '1' } };
    const result = await getStaticProps(ctx);

    expect(result).toStrictEqual({
      props: {
        swr: {
          expires: 0,
          dedupingInterval: expect.any(Number),
          time: expect.any(Number),
        },
        foo: 'bar',
      },
      revalidate: false,
    });
  });
});
