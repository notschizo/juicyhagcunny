import { describe, expect, it } from 'vitest';
import {
  dpopAthFromAccessToken,
  ecdsaDerSignatureToRawP256,
  ecdsaSignatureToRawP256,
  generateDpopKeypair,
  jwkThumbprintS256,
  signDpopProof
} from '@fxembed/atmosphere/providers/bluesky/auth/dpop';
import {
  generatePkceVerifier,
  isValidPkceVerifier,
  pkceChallengeFromVerifier
} from '@fxembed/atmosphere/providers/bluesky/auth/pkce';

describe('pkce', () => {
  it('generates verifier in RFC length bounds', () => {
    const v = generatePkceVerifier();
    expect(isValidPkceVerifier(v)).toBe(true);
  });

  it('produces stable S256 challenge for same verifier', async () => {
    const v = 'test-verifier-012345678901234567890123456789012';
    const c1 = await pkceChallengeFromVerifier(v);
    const c2 = await pkceChallengeFromVerifier(v);
    expect(c1).toBe(c2);
    expect(c1.length).toBeGreaterThan(40);
  });
});

describe('dpop', () => {
  it('generates keypair with EC P-256 public JWK', async () => {
    const kp = await generateDpopKeypair();
    expect(kp.publicJwk.kty).toBe('EC');
    expect(kp.publicJwk.crv).toBe('P-256');
    expect(kp.publicJwk.x).toBeTruthy();
    expect(kp.publicJwk.y).toBeTruthy();
    expect(kp.privateJwk.d).toBeTruthy();
  });

  it('jwk thumbprint is deterministic', async () => {
    const kp = await generateDpopKeypair();
    const t1 = await jwkThumbprintS256(kp.publicJwk);
    const t2 = await jwkThumbprintS256(kp.publicJwk);
    expect(t1).toBe(t2);
    expect(t1.length).toBe(43);
  });

  it('signs DPoP proof verifiable with public key', async () => {
    const kp = await generateDpopKeypair();
    const jwt = await signDpopProof({
      keypair: kp,
      htm: 'POST',
      htu: 'https://example.com/oauth/token',
      jti: 'fixedjti12345678',
      iat: 1700000000
    });
    const [h, p, s] = jwt.split('.');
    expect(h && p && s).toBeTruthy();

    const pub = await crypto.subtle.importKey(
      'jwk',
      kp.publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const pad = '='.repeat((4 - (s!.length % 4)) % 4);
    const b64 = (s! + pad).replace(/-/g, '+').replace(/_/g, '/');
    const sigBin = atob(b64);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) sigBytes[i] = sigBin.charCodeAt(i);

    const signingInput = new TextEncoder().encode(`${h}.${p}`);
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pub,
      sigBytes,
      signingInput
    );
    expect(ok).toBe(true);
  });

  it('ath matches SHA-256 of access token', async () => {
    const tok = 'some.access.token';
    const ath = await dpopAthFromAccessToken(tok);
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tok))
    );
    let bin = '';
    for (let i = 0; i < digest.length; i++) bin += String.fromCharCode(digest[i]!);
    const expected = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(ath).toBe(expected);
  });

  it('round-trips DER to raw P-256 for verify', async () => {
    const kp = await generateDpopKeypair();
    const priv = await crypto.subtle.importKey(
      'jwk',
      { ...kp.privateJwk, key_ops: ['sign'] },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    const msg = new TextEncoder().encode('hello');
    const der = new Uint8Array(
      await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, msg)
    );
    const raw = ecdsaSignatureToRawP256(der);
    expect(raw.length).toBe(64);
    const pub = await crypto.subtle.importKey(
      'jwk',
      kp.publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, raw, msg);
    expect(ok).toBe(true);
  });
});
