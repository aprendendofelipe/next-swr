import { NextResponse } from 'next/server';
import clock from 'next-swr/clock';

// optional middleware matcher
// export const config = { matcher: ['/swr', '/others-paths'] };

// export const middleware = clock(); // default config
export const middleware = clock(myOriginalMiddleware); // custom config

async function myOriginalMiddleware() {
  return NextResponse.next();
}
