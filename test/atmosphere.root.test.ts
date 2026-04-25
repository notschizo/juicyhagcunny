import { test, expect } from 'vitest';
import { app } from '../src/worker';
import { botHeaders } from './helpers/data';
import harness from './helpers/harness';

const executionCtx = {
  waitUntil() {}
};

test('Atmosphere root does not redirect (no trailing-slash 301 loop)', async () => {
  const res = await app.request(
    new Request('https://api.atmosphere.tools/', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness,
    executionCtx
  );

  expect(res.status).toEqual(200);
  expect(res.headers.get('location')).toBeNull();

  const body = (await res.json()) as {
    service: string;
    version: string;
    openapi: string;
  };
  expect(body.service).toEqual('atmosphere');
  expect(body.openapi).toEqual('/2/openapi.json');
});
