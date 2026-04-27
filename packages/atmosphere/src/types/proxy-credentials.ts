/** PDS + app password for anonymous proxy fallback (server-side only; never send to clients). */
export type BlueskyProxyCredentials = {
  identifier: string;
  appPassword: string;
  service: string;
};
