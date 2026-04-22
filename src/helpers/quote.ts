import i18next from 'i18next';
import type { APIStatusTombstone } from '../realms/api/schemas';
import { isTombstone } from './tombstone';

/* Helper for Quote Tweets */
export const handleQuote = (quote: APIStatus | APIStatusTombstone): string | null => {
  if (isTombstone(quote)) {
    return `\n${i18next.t('quotedFromTombstone')}: ${quote.message}`;
  }

  console.log('Quoting status ', quote.id);

  let str = `\n`;
  str += i18next.t('quotedFrom').format({
    name: quote.author?.name || '',
    screen_name: quote.author?.screen_name || ''
  });

  str += ` \n\n`;
  str += quote.text;

  return str;
};
