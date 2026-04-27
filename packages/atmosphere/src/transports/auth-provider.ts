import type { AtmosphereSocialProvider } from '../types/social-provider.js';

/**
 * Pluggable auth for the `authenticated` transport (OAuth, app passwords, etc.).
 * Horizon / future clients implement this; FxEmbed public worker does not ship an implementation yet.
 */
export type AuthProvider<P extends AtmosphereSocialProvider> = {
  /** Provider key this auth applies to */
  readonly provider: P;
  getAuthHeadersForRequest(req: {
    method: string;
    url: string;
    body?: unknown;
  }): Promise<Record<string, string>>;
  /** Optional refresh (e.g. token rotation) */
  refresh?(): Promise<void>;
};
