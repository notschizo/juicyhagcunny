import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateDpopKeypair } from '@fxembed/atmosphere/providers/bluesky/auth/dpop';
import { pushAuthorizationRequest } from '@fxembed/atmosphere/providers/bluesky/auth/par';
import { exchangeAuthorizationCode } from '@fxembed/atmosphere/providers/bluesky/auth/tokens';
import { buildBlueskyClientMetadata } from '@fxembed/atmosphere/providers/bluesky/auth/client-metadata';

const meta = {
  issuer: 'https://as.example',
  authorization_endpoint: 'https://as.example/oauth',
  token_endpoint: 'https://as.example/token',
  pushed_authorization_request_endpoint: 'https://as.example/par'
};

describe('Bluesky OAuth flow pieces', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildBlueskyClientMetadata includes DPoP flag', () => {
    const m = buildBlueskyClientMetadata({
      clientId: 'https://app.example/client-metadata.json',
      redirectUris: ['https://app.example/callback'],
      scope: 'atproto transition:generic',
      applicationType: 'web',
      clientName: 'Test'
    });
    expect(m.client_id).toBe('https://app.example/client-metadata.json');
    expect(m.dpop_bound_access_tokens).toBe(true);
    expect(m.grant_types).toContain('authorization_code');
  });

  it('PAR retries once on use_dpop_nonce', async () => {
    const dpop = await generateDpopKeypair();
    let parCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.startsWith('https://as.example/par')) {
        parCalls += 1;
        if (parCalls === 1) {
          return new Response('{}', {
            status: 400,
            headers: {
              'WWW-Authenticate': 'Bearer error="use_dpop_nonce"',
              'DPoP-Nonce': 'server-par-nonce'
            }
          });
        }
        return Response.json({
          request_uri: 'urn:ietf:params:oauth:request_uri:test',
          expires_in: 90
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const out = await pushAuthorizationRequest({
      metadata: meta,
      clientId: 'https://app.example/client-metadata.json',
      redirectUri: 'https://app.example/callback',
      scope: 'atproto transition:generic',
      state: 'state-1',
      pkceChallenge: 'challenge-1',
      dpop,
      fetchImpl: globalThis.fetch
    });
    expect(out?.requestUri).toContain('request_uri:test');
    expect(parCalls).toBe(2);
  });

  it('PAR retries when server sends DPoP-Nonce without WWW-Authenticate (Bluesky)', async () => {
    const dpop = await generateDpopKeypair();
    let parCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.startsWith('https://as.example/par')) {
        parCalls += 1;
        if (parCalls === 1) {
          return new Response(
            JSON.stringify({
              error: 'use_dpop_nonce',
              error_description: 'Authorization server requires nonce in DPoP proof'
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'DPoP-Nonce': 'server-par-nonce'
              }
            }
          );
        }
        return Response.json({
          request_uri: 'urn:ietf:params:oauth:request_uri:test',
          expires_in: 90
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const out = await pushAuthorizationRequest({
      metadata: meta,
      clientId: 'https://app.example/client-metadata.json',
      redirectUri: 'https://app.example/callback',
      scope: 'atproto transition:generic',
      state: 'state-1',
      pkceChallenge: 'challenge-1',
      dpop,
      fetchImpl: globalThis.fetch
    });
    expect(out?.requestUri).toContain('request_uri:test');
    expect(parCalls).toBe(2);
  });

  it('exchangeAuthorizationCode parses token JSON', async () => {
    const dpop = await generateDpopKeypair();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        access_token: 'access-xyz',
        refresh_token: 'refresh-xyz',
        expires_in: 120,
        scope: 'atproto transition:generic'
      })
    );
    const bundle = await exchangeAuthorizationCode({
      tokenEndpoint: 'https://as.example/token',
      clientId: 'https://app.example/client-metadata.json',
      redirectUri: 'https://app.example/callback',
      code: 'auth-code',
      pkceVerifier: 'a'.repeat(43),
      dpop,
      fetchImpl: globalThis.fetch
    });
    expect(bundle.accessToken).toBe('access-xyz');
    expect(bundle.refreshToken).toBe('refresh-xyz');
    expect(bundle.scope).toBe('atproto transition:generic');
  });
});
