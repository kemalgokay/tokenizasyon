import { IdempotencyMiddleware, InMemoryIdempotencyStore } from '../libs/common/src';

const createMockRes = () => {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: (key: string, value: string) => {
      res.headers[key] = value;
    },
    status: (code: number) => {
      res.statusCode = code;
      return res;
    },
    type: () => res,
    send: (body: any) => {
      res.body = body;
      return res;
    },
  };
  return res;
};

describe('IdempotencyMiddleware', () => {
  test('returns same response for repeated key', async () => {
    const store = new InMemoryIdempotencyStore();
    const middleware = new IdempotencyMiddleware(store);
    const req: any = { method: 'POST', path: '/tokens/1/mint', body: { amount: '10' }, header: (name: string) => (name === 'Idempotency-Key' ? 'abc' : null) };
    const res = createMockRes();
    await middleware.use(req, res, () => {
      res.send({ ok: true });
    });
    const secondRes = createMockRes();
    await middleware.use(req, secondRes, () => {
      secondRes.send({ ok: false });
    });
    expect(secondRes.body).toEqual({ ok: true });
  });
});
