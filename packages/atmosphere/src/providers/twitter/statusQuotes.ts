import { searchAPI } from './search.js';
import type { APISearchResults } from '../../types/api-schemas.js';
import type { TwitterBuildHost } from './build-host.js';

export const statusQuotesAPI = async (
  statusId: string,
  count: number,
  cursor: string | null,
  host: TwitterBuildHost,
  language?: string
): Promise<APISearchResults> => {
  return searchAPI(`quoted_tweet_id:${statusId}`, 'latest', count, cursor, host, language);
};
