import { addApiFeatures, requestApi } from './api';
import { TwitterAuth } from './auth';
import { getUserIdByScreenName } from './profile';
import { QueryTweetsResponse } from './timeline-v1';
import {
  parseTimelineTweetsV2,
  TimelineV2,
  TimelineEntryItemContentRaw,
  parseTimelineEntryItemContentRaw,
  ThreadedConversation,
  parseThreadedConversation,
} from './timeline-v2';
import { getTweetTimeline } from './timeline-async';
import { apiRequestFactory } from './api-data';
import { ListTimeline, parseListTimelineTweets } from './timeline-list';
import { Headers } from 'headers-polyfill';

export interface Mention {
  id: string;
  username?: string;
  name?: string;
}

export interface Photo {
  id: string;
  url: string;
  alt_text: string | undefined;
}

export interface Video {
  id: string;
  preview: string;
  url?: string;
}

export interface PlaceRaw {
  id?: string;
  place_type?: string;
  name?: string;
  full_name?: string;
  country_code?: string;
  country?: string;
  bounding_box?: {
    type?: string;
    coordinates?: number[][][];
  };
}

/**
 * A parsed Tweet object.
 */
export interface Tweet {
  bookmarkCount?: number;
  conversationId?: string;
  hashtags: string[];
  html?: string;
  id?: string;
  inReplyToStatus?: Tweet;
  inReplyToStatusId?: string;
  isQuoted?: boolean;
  isPin?: boolean;
  isReply?: boolean;
  isRetweet?: boolean;
  isSelfThread?: boolean;
  likes?: number;
  name?: string;
  mentions: Mention[];
  permanentUrl?: string;
  photos: Photo[];
  place?: PlaceRaw;
  quotedStatus?: Tweet;
  quotedStatusId?: string;
  replies?: number;
  retweets?: number;
  retweetedStatus?: Tweet;
  retweetedStatusId?: string;
  text?: string;
  thread: Tweet[];
  timeParsed?: Date;
  timestamp?: number;
  urls: string[];
  userId?: string;
  username?: string;
  videos: Video[];
  views?: number;
  sensitiveContent?: boolean;
}

export type TweetQuery =
  | Partial<Tweet>
  | ((tweet: Tweet) => boolean | Promise<boolean>);

export const features = addApiFeatures({
  interactive_text_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_text_conversations_enabled: false,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
    false,
  vibe_api_enabled: false,
});

export async function fetchTweets(
  userId: string,
  maxTweets: number,
  cursor: string | undefined,
  auth: TwitterAuth,
): Promise<QueryTweetsResponse> {
  if (maxTweets > 200) {
    maxTweets = 200;
  }

  const userTweetsRequest = apiRequestFactory.createUserTweetsRequest();
  userTweetsRequest.variables.userId = userId;
  userTweetsRequest.variables.count = maxTweets;
  userTweetsRequest.variables.includePromotedContent = false; // true on the website

  if (cursor != null && cursor != '') {
    userTweetsRequest.variables['cursor'] = cursor;
  }

  const res = await requestApi<TimelineV2>(
    userTweetsRequest.toRequestUrl(),
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  return parseTimelineTweetsV2(res.value);
}

export async function fetchTweetsAndReplies(
  userId: string,
  maxTweets: number,
  cursor: string | undefined,
  auth: TwitterAuth,
): Promise<QueryTweetsResponse> {
  if (maxTweets > 40) {
    maxTweets = 40;
  }

  const userTweetsRequest =
    apiRequestFactory.createUserTweetsAndRepliesRequest();
  userTweetsRequest.variables.userId = userId;
  userTweetsRequest.variables.count = maxTweets;
  userTweetsRequest.variables.includePromotedContent = false; // true on the website

  if (cursor != null && cursor != '') {
    userTweetsRequest.variables['cursor'] = cursor;
  }

  const res = await requestApi<TimelineV2>(
    userTweetsRequest.toRequestUrl(),
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  return parseTimelineTweetsV2(res.value);
}

export async function fetchListTweets(
  listId: string,
  maxTweets: number,
  cursor: string | undefined,
  auth: TwitterAuth,
): Promise<QueryTweetsResponse> {
  if (maxTweets > 200) {
    maxTweets = 200;
  }

  const listTweetsRequest = apiRequestFactory.createListTweetsRequest();
  listTweetsRequest.variables.listId = listId;
  listTweetsRequest.variables.count = maxTweets;

  if (cursor != null && cursor != '') {
    listTweetsRequest.variables['cursor'] = cursor;
  }

  const res = await requestApi<ListTimeline>(
    listTweetsRequest.toRequestUrl(),
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  return parseListTimelineTweets(res.value);
}

export function getTweets(
  user: string,
  maxTweets: number,
  auth: TwitterAuth,
): AsyncGenerator<Tweet, void> {
  return getTweetTimeline(user, maxTweets, async (q, mt, c) => {
    const userIdRes = await getUserIdByScreenName(q, auth);

    if (!userIdRes.success) {
      throw userIdRes.err;
    }

    const { value: userId } = userIdRes;

    return fetchTweets(userId, mt, c, auth);
  });
}

export function getTweetsByUserId(
  userId: string,
  maxTweets: number,
  auth: TwitterAuth,
): AsyncGenerator<Tweet, void> {
  return getTweetTimeline(userId, maxTweets, (q, mt, c) => {
    return fetchTweets(q, mt, c, auth);
  });
}

export function getTweetsAndReplies(
  user: string,
  maxTweets: number,
  auth: TwitterAuth,
): AsyncGenerator<Tweet, void> {
  return getTweetTimeline(user, maxTweets, async (q, mt, c) => {
    const userIdRes = await getUserIdByScreenName(q, auth);

    if (!userIdRes.success) {
      throw userIdRes.err;
    }

    const { value: userId } = userIdRes;

    return fetchTweetsAndReplies(userId, mt, c, auth);
  });
}

export function getTweetsAndRepliesByUserId(
  userId: string,
  maxTweets: number,
  auth: TwitterAuth,
): AsyncGenerator<Tweet, void> {
  return getTweetTimeline(userId, maxTweets, (q, mt, c) => {
    return fetchTweetsAndReplies(q, mt, c, auth);
  });
}

export async function fetchLikedTweets(
  userId: string,
  maxTweets: number,
  cursor: string | undefined,
  auth: TwitterAuth,
): Promise<QueryTweetsResponse> {
  if (!auth.isLoggedIn()) {
    throw new Error('Scraper is not logged-in for fetching liked tweets.');
  }

  if (maxTweets > 200) {
    maxTweets = 200;
  }

  const userTweetsRequest = apiRequestFactory.createUserLikedTweetsRequest();
  userTweetsRequest.variables.userId = userId;
  userTweetsRequest.variables.count = maxTweets;
  userTweetsRequest.variables.includePromotedContent = false; // true on the website

  if (cursor != null && cursor != '') {
    userTweetsRequest.variables['cursor'] = cursor;
  }

  const res = await requestApi<TimelineV2>(
    userTweetsRequest.toRequestUrl(),
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  return parseTimelineTweetsV2(res.value);
}

export function getLikedTweets(
  user: string,
  maxTweets: number,
  auth: TwitterAuth,
): AsyncGenerator<Tweet, void> {
  return getTweetTimeline(user, maxTweets, async (q, mt, c) => {
    const userIdRes = await getUserIdByScreenName(q, auth);

    if (!userIdRes.success) {
      throw userIdRes.err;
    }

    const { value: userId } = userIdRes;

    return fetchLikedTweets(userId, mt, c, auth);
  });
}

export async function getTweetWhere(
  tweets: AsyncIterable<Tweet>,
  query: TweetQuery,
): Promise<Tweet | null> {
  const isCallback = typeof query === 'function';

  for await (const tweet of tweets) {
    const matches = isCallback
      ? await query(tweet)
      : checkTweetMatches(tweet, query);

    if (matches) {
      return tweet;
    }
  }

  return null;
}

export async function getTweetsWhere(
  tweets: AsyncIterable<Tweet>,
  query: TweetQuery,
): Promise<Tweet[]> {
  const isCallback = typeof query === 'function';
  const filtered = [];

  for await (const tweet of tweets) {
    const matches = isCallback ? query(tweet) : checkTweetMatches(tweet, query);

    if (!matches) continue;
    filtered.push(tweet);
  }

  return filtered;
}

function checkTweetMatches(tweet: Tweet, options: Partial<Tweet>): boolean {
  return Object.keys(options).every((k) => {
    const key = k as keyof Tweet;
    return tweet[key] === options[key];
  });
}

export async function getLatestTweet(
  user: string,
  includeRetweets: boolean,
  max: number,
  auth: TwitterAuth,
): Promise<Tweet | null | void> {
  const timeline = getTweets(user, max, auth);

  // No point looping if max is 1, just use first entry.
  return max === 1
    ? (await timeline.next()).value
    : await getTweetWhere(timeline, { isRetweet: includeRetweets });
}

export interface TweetResultByRestId {
  data?: TimelineEntryItemContentRaw;
}

export async function getTweet(
  id: string,
  auth: TwitterAuth,
): Promise<Tweet | null> {
  const tweetDetailRequest = apiRequestFactory.createTweetDetailRequest();
  tweetDetailRequest.variables.focalTweetId = id;

  const res = await requestApi<ThreadedConversation>(
    tweetDetailRequest.toRequestUrl(),
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  if (!res.value) {
    return null;
  }

  const tweets = parseThreadedConversation(res.value);
  return tweets.find((tweet) => tweet.id === id) ?? null;
}

export async function getTweetAnonymous(
  id: string,
  auth: TwitterAuth,
): Promise<Tweet | null> {
  const tweetResultByRestIdRequest =
    apiRequestFactory.createTweetResultByRestIdRequest();
  tweetResultByRestIdRequest.variables.tweetId = id;

  const res = await requestApi<TweetResultByRestId>(
    tweetResultByRestIdRequest.toRequestUrl(),
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  if (!res.value.data) {
    return null;
  }

  return parseTimelineEntryItemContentRaw(res.value.data, id);
}

export interface CreateRetweetResponse {
  data: {
    create_retweet: {
      retweet_results: {
        result: RetweetResult;
      };
    };
  };
}

interface RetweetResult {
  rest_id: string;
  legacy: LegacyInfo;
}

interface LegacyInfo {
  full_text: string;
}

export async function retweetTweetById(
  tweet_id: string,
  auth: TwitterAuth,
): Promise<CreateRetweetResponse> {
  const body = {
    variables: {
      tweet_id: tweet_id,
      dark_request: false,
    },
    queryId: 'ojPdsZsimiJrUGLR1sjUtA',
  };

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const res = await requestApi<CreateRetweetResponse>(
    'https://twitter.com/i/api/graphql/ojPdsZsimiJrUGLR1sjUtA/CreateRetweet',
    auth,
    'POST',
    JSON.stringify(body),
    headers,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

export type GetUserTweetsResponse = {
  data: {
    user: {
      result: {
        __typename: string;
        timeline_v2: {
          timeline: {
            instructions: Array<
              TimelinePinEntryInstruction | TimelineAddEntriesInstruction
            >;
            metadata: {
              scribeConfig: {
                page: string;
              };
            };
          };
        };
      };
    };
  };
};

export type TimelinePinEntryInstruction = {
  type: 'TimelinePinEntry';
  entry: {
    entryId: string;
    sortIndex: string;
    content: TweetContent;
  };
};

export type TimelineAddEntriesInstruction = {
  type: 'TimelineAddEntries';
  entries: Array<{
    entryId: string;
    sortIndex: string;
    content: TweetContent;
  }>;
};

type TweetContent = {
  entryType: string;
  __typename: string;
  itemContent: {
    itemType: string;
    __typename: string;
    tweet_results: {
      result: TweetResult;
    };
    // Define other properties as needed
  };
};

type TweetResult = {
  __typename: string;
  rest_id: string;
  core: {
    user_results: {
      result: {
        __typename: string;
        id: string;
        rest_id: string;
        affiliates_highlighted_label: any;
        has_graduated_access: boolean;
        is_blue_verified: boolean;
        profile_image_shape: string;
        legacy: LegacyUser;
        tipjar_settings: Record<string, any>;
      };
    };
  };
  legacy: {
    bookmark_count: number;
    bookmarked: boolean;
    created_at: string;
    conversation_id_str: string;
    display_text_range: [number, number];
    entities: {
      hashtags: string[];
      symbols: string[];
      timestamps: any[]; // You might want to define a type for timestamps
      urls: string[];
      user_mentions: string[];
    };
    favorite_count: number;
    favorited: boolean;
    full_text: string;
    is_quote_status: boolean;
    lang: string;
    quote_count: number;
    reply_count: number;
    retweet_count: number;
    retweeted: boolean;
    user_id_str: string;
    id_str: string;
  };
};

type LegacyUser = {
  followed_by: boolean;
  following: boolean;
  can_dm: boolean;
  // Define other properties as needed
};

export interface GetUserTweetsParams {
  userId: string;
  cursor?: string;
}

export async function getUserTweets(
  auth: TwitterAuth,
  { userId, cursor }: GetUserTweetsParams,
): Promise<GetUserTweetsResponse> {
  const rawParams = {
    variables: {
      userId,
      count: 20,
      cursor,
      includePromotedContent: false, //
      withQuickPromoteEligibilityTweetFields: false, //
      withVoice: false, //
      withV2Timeline: true,
    },
    features: {
      rweb_tipjar_consumption_enabled: false, //
      responsive_web_graphql_exclude_directive_enabled: false, //
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: false, //
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: true, //
      communities_web_enable_tweet_community_results_fetch: false, //
      c9s_tweet_anatomy_moderator_badge_enabled: false, //
      articles_preview_enabled: false, //
      tweetypie_unmention_optimization_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: false, //
      longform_notetweets_consumption_enabled: false, //
      responsive_web_twitter_article_tweet_consumption_enabled: false, //
      tweet_awards_web_tipping_enabled: false,
      creator_subscriptions_quote_tweet_preview_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
        false, //
      tweet_with_visibility_results_prefer_gql_media_interstitial_enabled:
        false, //
      rweb_video_timestamps_enabled: false, //
      longform_notetweets_rich_text_read_enabled: false, //
      longform_notetweets_inline_media_enabled: false, //
      responsive_web_enhance_cards_enabled: false,
    },
    fieldToggles: {
      withArticlePlainText: false,
    },
  };

  const builtParams = Object.entries(rawParams).reduce((a, [k, v]) => {
    a[k] = JSON.stringify(v);
    return a;
  }, {} as Record<string, string>);

  const queryParams = new URLSearchParams(builtParams);

  const res = await requestApi<GetUserTweetsResponse>(
    `https://twitter.com/i/api/graphql/9zyyd1hebl7oNWIPdA8HRw/UserTweets?${queryParams.toString()}`,
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}
