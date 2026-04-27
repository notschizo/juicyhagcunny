import type { BlueskyProxyCredentials } from '../types/proxy-credentials.js';

/**
 * Configurable Bluesky web/API roots and feature domain lists.
 * The FxEmbed worker calls {@link setBlueskyProviderEnv} at startup (see `worker.ts`).
 */
export type BlueskyProviderEnv = {
  apiRoot: string;
  webRoot: string;
  videoBase: string;
  mosaicBskyDomainList: string[];
  polyglotDomainList: string[];
};

const defaultEnv: BlueskyProviderEnv = {
  apiRoot: 'https://public.api.bsky.app',
  webRoot: 'https://bsky.app',
  videoBase: 'https://video.bsky.app',
  mosaicBskyDomainList: [],
  polyglotDomainList: []
};

let env: BlueskyProviderEnv = { ...defaultEnv };

export function setBlueskyProviderEnv(partial: Partial<BlueskyProviderEnv>): void {
  env = { ...env, ...partial };
}

export function getBlueskyProviderEnv(): BlueskyProviderEnv {
  return env;
}

/**
 * PDS proxy account access (decrypt + session) lives in the worker; this interface is registered at startup.
 */
export type BlueskyProxyRuntime = {
  initCredentials: (key: string | undefined) => Promise<void>;
  hasBundledEncryptedCredentials: () => boolean;
  hasBlueskyProxyAccounts: () => boolean;
  getShuffledBlueskyAccounts: (preferredHostname?: string) => BlueskyProxyCredentials[];
  blueskyProxyServiceHostname: (service: string) => string;
};

let proxy: BlueskyProxyRuntime | null = null;

export function setBlueskyProxyRuntime(r: BlueskyProxyRuntime): void {
  proxy = r;
}

export function getBlueskyProxyRuntime(): BlueskyProxyRuntime {
  if (!proxy) {
    throw new Error(
      'Bluesky proxy runtime not configured: call setBlueskyProxyRuntime() from the FxEmbed worker (see worker.ts)'
    );
  }
  return proxy;
}
