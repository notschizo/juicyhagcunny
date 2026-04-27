import { expect, test } from 'vitest';
import {
  BLUESKY_APP_OFFICIAL_ISSUER_DID,
  blueskyVerificationToApiUserVerification
} from '@fxembed/atmosphere/providers/bluesky/verification';

test('blueskyVerificationToApiUserVerification returns undefined when not valid', () => {
  expect(blueskyVerificationToApiUserVerification(undefined)).toBeUndefined();
  expect(
    blueskyVerificationToApiUserVerification({ verifiedStatus: 'none', verifications: [] })
  ).toBeUndefined();
});

test('blueskyVerificationToApiUserVerification maps official Bluesky issuer to bsky.app', () => {
  expect(
    blueskyVerificationToApiUserVerification({
      verifiedStatus: 'valid',
      verifications: [
        { issuer: 'did:plc:other', isValid: true },
        { issuer: BLUESKY_APP_OFFICIAL_ISSUER_DID, isValid: true }
      ]
    })
  ).toEqual({
    verified: true,
    type: null,
    verified_at: null,
    verified_by: 'bsky.app'
  });
});

test('blueskyVerificationToApiUserVerification uses first valid non-official issuer DID', () => {
  expect(
    blueskyVerificationToApiUserVerification({
      verifiedStatus: 'valid',
      verifications: [{ issuer: 'did:plc:nytimesfixture', isValid: true }]
    })
  ).toEqual({
    verified: true,
    type: null,
    verified_at: null,
    verified_by: 'did:plc:nytimesfixture'
  });
});

test('blueskyVerificationToApiUserVerification falls back to trusted_verifier when verifications missing', () => {
  expect(
    blueskyVerificationToApiUserVerification({ verifiedStatus: 'valid', verifications: [] })
  ).toEqual({
    verified: true,
    type: null,
    verified_at: null,
    verified_by: 'trusted_verifier'
  });
});
