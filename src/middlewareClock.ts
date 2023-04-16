import { NextResponse } from 'next/server';
import { NextRequest } from './types';

export function middlewareClock(middleware: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const { pathname } = request.nextUrl;

    if (pathname === '/swr') {
      return new NextResponse(JSON.stringify({ timestamp: Date.now() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof middleware !== 'function') return NextResponse.next();

    return await middleware(request);
  };
}
