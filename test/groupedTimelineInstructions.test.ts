import { describe, expect, it } from 'vitest';
import { processGroupedTimelineInstructions } from '../src/providers/twitter/search';

const minimalTweet = (id: string, conversationId: string) =>
  ({
    __typename: 'Tweet',
    rest_id: id,
    core: {
      user_results: {
        result: {
          __typename: 'User',
          rest_id: '67',
          core: { screen_name: 'u', name: 'U' },
          legacy: {
            screen_name: 'u',
            name: 'U',
            followers_count: 0,
            friends_count: 0,
            favourites_count: 0,
            media_count: 0,
            statuses_count: 0
          }
        }
      }
    },
    legacy: {
      id_str: id,
      conversation_id_str: conversationId,
      full_text: `t${id}`,
      created_at: 'Mon Jan 01 00:00:00 +0000 2024',
      display_text_range: [0, 1],
      favorite_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0,
      entities: { hashtags: [], symbols: [], urls: [], user_mentions: [] },
      user_id_str: '67'
    }
  }) as GraphQLTwitterStatus;

describe('processGroupedTimelineInstructions', () => {
  it('groups TimelineTimelineModule rows and captures allTweetIds', () => {
    const t1 = minimalTweet('111', '111');
    const t2 = minimalTweet('222', '111');
    const t3 = minimalTweet('333', '111');
    const instructions: TimelineInstruction[] = [
      {
        type: 'TimelineAddEntries',
        entries: [
          {
            entryId: 'profile-conversation-777',
            sortIndex: '1',
            content: {
              __typename: 'TimelineTimelineModule',
              entryType: 'TimelineTimelineModule',
              metadata: {
                conversationMetadata: {
                  allTweetIds: [
                    '111',
                    '222',
                    '333',
                    '999'
                  ]
                }
              },
              items: [
                {
                  item: {
                    itemContent: {
                      __typename: 'TimelineTweet',
                      tweet_results: { result: t1 }
                    }
                  }
                },
                {
                  item: {
                    itemContent: {
                      __typename: 'TimelineTweet',
                      tweet_results: { result: t2 }
                    }
                  }
                },
                {
                  item: {
                    itemContent: {
                      __typename: 'TimelineTweet',
                      tweet_results: { result: t3 }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ];

    const { entries } = processGroupedTimelineInstructions(instructions);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('thread');
    if (entries[0].kind !== 'thread') return;
    expect(entries[0].conversation_id).toBe('777');
    expect(entries[0].statuses.map(s => s.rest_id ?? s.legacy?.id_str)).toEqual([
      '111',
      '222',
      '333'
    ]);
    expect(entries[0].all_status_ids).toEqual([
      '111',
      '222',
      '333',
      '999'
    ]);
  });

  it('reads allTweetIds from timeline entry when omitted on module content', () => {
    const t1 = minimalTweet('1', '1');
    const t2 = minimalTweet('2', '1');
    const instructions: TimelineInstruction[] = [
      {
        type: 'TimelineAddEntries',
        entries: [
          {
            entryId: 'profile-conversation-77',
            metadata: {
              conversationMetadata: {
                allTweetIds: ['1', '2', '3']
              }
            },
            content: {
              __typename: 'TimelineTimelineModule',
              entryType: 'TimelineTimelineModule',
              items: [
                {
                  item: {
                    itemContent: {
                      __typename: 'TimelineTweet',
                      tweet_results: { result: t1 }
                    }
                  }
                },
                {
                  item: {
                    itemContent: {
                      __typename: 'TimelineTweet',
                      tweet_results: { result: t2 }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ];
    const { entries } = processGroupedTimelineInstructions(instructions);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('thread');
    if (entries[0].kind !== 'thread') return;
    expect(entries[0].all_status_ids).toEqual(['1', '2', '3']);
  });

  it('emits a single status entry for one-tweet module without extra allTweetIds', () => {
    const t1 = minimalTweet('1', '1');
    const instructions: TimelineInstruction[] = [
      {
        type: 'TimelineAddEntries',
        entries: [
          {
            entryId: 'profile-conversation-99',
            content: {
              __typename: 'TimelineTimelineModule',
              entryType: 'TimelineTimelineModule',
              items: [
                {
                  item: {
                    itemContent: {
                      __typename: 'TimelineTweet',
                      tweet_results: { result: t1 }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ];
    const { entries } = processGroupedTimelineInstructions(instructions);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('status');
  });
});
