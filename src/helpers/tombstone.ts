import i18next from 'i18next';
import type {
  APIBlueskyStatus,
  APIMastodonStatus,
  APITombstoneReason,
  APITwitterStatus,
  APIStatusTombstone
} from '../realms/api/schemas';
import type { APIStatus, SocialConversation, SocialThread } from '../types/apiStatus';

export function isTombstone(
  x: unknown
): x is APIStatusTombstone {
  return typeof x === 'object' && x !== null && (x as APIStatusTombstone).type === 'tombstone';
}

const tombstoneI18nKey: Record<APITombstoneReason, string> = {
  deleted: 'tombstoneMessageDeleted',
  suspended: 'tombstoneMessageSuspended',
  private: 'tombstoneMessagePrivate',
  blocked: 'tombstoneMessageBlocked',
  unavailable: 'tombstoneMessageUnavailable'
};

/** User-facing message for API `reason` (i18n when available). */
export const tombstoneMessageForReason = (reason: APITombstoneReason): string => {
  const key = tombstoneI18nKey[reason];
  const t = i18next.t(key);
  return t !== key ? t : fallbackMessageEn(reason);
};

function fallbackMessageEn(reason: APITombstoneReason): string {
  switch (reason) {
    case 'deleted':
      return 'This post is deleted';
    case 'suspended':
      return 'This post is from a suspended account';
    case 'private':
      return 'This post is from a private account';
    case 'blocked':
      return 'This post has been blocked from view by its author';
    case 'unavailable':
    default:
      return 'This post is unavailable';
  }
}

type Statusish = APIStatus | APITwitterStatus | APIBlueskyStatus | APIMastodonStatus;

function stripQuotesDeep(s: Statusish): void {
  if (isTombstone(s)) return;
  const q = s.quote;
  if (!q) return;
  if (isTombstone(q)) {
    delete s.quote;
    return;
  }
  stripQuotesDeep(q as Statusish);
}

/** Remove tombstones from thread/replies and nested quotes (legacy / `flags.api` embed JSON). */
export function stripTombstones<T extends SocialThread | SocialConversation>(obj: T): T {
  if (obj.status && !isTombstone(obj.status)) {
    stripQuotesDeep(obj.status as Statusish);
  }
  if (obj.thread?.length) {
    for (const item of obj.thread) {
      if (!isTombstone(item)) stripQuotesDeep(item as Statusish);
    }
    (obj as SocialThread).thread = obj.thread.filter(s => !isTombstone(s)) as typeof obj.thread;
  }
  if ('replies' in obj && obj.replies?.length) {
    for (const item of obj.replies) {
      if (!isTombstone(item)) stripQuotesDeep(item as Statusish);
    }
    (obj as SocialConversation).replies = obj.replies.filter(s => !isTombstone(s)) as typeof obj.replies;
  }
  return obj;
}
