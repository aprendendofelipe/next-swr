class MockRouter {
  asPath = '/mock-path';
  events = {
    on: jest.fn(),
    off: jest.fn(),
  };
  prefetch = jest.fn();
  replace = jest.fn();
  push(path: string) {
    const routerEventsOn = this.events.on as unknown as jest.Mock;
    const routeChangeStart = routerEventsOn.mock.calls[0][1];
    const routeChangeEnd = routerEventsOn.mock.calls[1][1];
    routeChangeStart(path);
    this.asPath = path;
    routeChangeEnd();
  }

  constructor() {
    return this;
  }

  clear() {
    this.asPath = '/mock-path';
    this.events.on.mockReset();
    this.events.off.mockReset();
    this.prefetch.mockReset();
    this.replace.mockReset();
  }
}

export const mockRouter = new MockRouter();

jest.mock('next/router', () => ({ useRouter: () => mockRouter }));

beforeEach(() => mockRouter.clear());
