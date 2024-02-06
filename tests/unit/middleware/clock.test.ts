/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';

import clock from 'src/middleware/clock';

describe('middlewareClock', () => {
  describe('when middleware is not a function', () => {
    it('should return a JSON response with the current timestamp for /swr route', async () => {
      const initialTime = Date.now();

      const request = {
        nextUrl: {
          pathname: '/swr',
        },
      } as NextRequest;

      const response = await clock()(request);
      const body = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(body).toHaveProperty('timestamp');
      expect(body.timestamp).toBeGreaterThanOrEqual(initialTime);
      expect(body.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should return NextResponse if middleware for non /swr routes', async () => {
      const request = {
        nextUrl: {
          pathname: '/some-other-route',
        },
      } as NextRequest;

      const response = await clock()(request);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('when middleware is a function', () => {
    it('should return a JSON response with the current timestamp for /swr route', async () => {
      const initialTime = Date.now();

      const request = {
        nextUrl: {
          pathname: '/swr',
        },
      } as NextRequest;

      const middleware = jest.fn(async () => new NextResponse('Hello World'));

      const response = await clock(middleware)(request);
      const body = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(body).toHaveProperty('timestamp');
      expect(body.timestamp).toBeGreaterThanOrEqual(initialTime);
      expect(body.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should call the provided middleware for non /swr routes', async () => {
      const request = {
        nextUrl: {
          pathname: '/some-other-route',
        },
      } as NextRequest;

      const middleware = jest.fn(async () => new NextResponse('Hello World'));

      const response = await clock(middleware)(request);
      const body = await response.text();

      expect(middleware).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
      expect(response).toBeInstanceOf(NextResponse);
      expect(body).toBe('Hello World');
    });
  });
});
