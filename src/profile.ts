import stringify from 'json-stable-stringify';
import { requestApi, RequestApiResult } from './api';
import { TwitterAuth } from './auth';
import { TwitterApiErrorRaw } from './errors';
import { SendMessageResponse } from './dialogs';
import formurlencoded from 'form-urlencoded';
import { Headers } from 'headers-polyfill';
export interface LegacyUserRaw {
  created_at?: string;
  description?: string;
  entities?: {
    url?: {
      urls?: {
        expanded_url?: string;
      }[];
    };
  };
  favourites_count?: number;
  followers_count?: number;
  friends_count?: number;
  media_count?: number;
  statuses_count?: number;
  id_str?: string;
  listed_count?: number;
  name?: string;
  location: string;
  geo_enabled?: boolean;
  pinned_tweet_ids_str?: string[];
  profile_background_color?: string;
  profile_banner_url?: string;
  profile_image_url_https?: string;
  protected?: boolean;
  screen_name?: string;
  verified?: boolean;
  has_custom_timelines?: boolean;
  has_extended_profile?: boolean;
  url?: string;
  can_dm?: boolean;
}

/**
 * A parsed profile object.
 */
export interface Profile {
  avatar?: string;
  banner?: string;
  biography?: string;
  birthday?: string;
  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;
  mediaCount?: number;
  statusesCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  isBlueVerified?: boolean;
  joined?: Date;
  likesCount?: number;
  listedCount?: number;
  location: string;
  name?: string;
  pinnedTweetIds?: string[];
  tweetsCount?: number;
  url?: string;
  userId?: string;
  username?: string;
  website?: string;
  canDm?: boolean;
}

export interface UserRaw {
  data: {
    user: {
      result: {
        rest_id?: string;
        is_blue_verified?: boolean;
        legacy: LegacyUserRaw;
      };
    };
  };
  errors?: TwitterApiErrorRaw[];
}

function getAvatarOriginalSizeUrl(avatarUrl: string | undefined) {
  return avatarUrl ? avatarUrl.replace('_normal', '') : undefined;
}

export function parseProfile(
  user: LegacyUserRaw,
  isBlueVerified?: boolean,
): Profile {
  const profile: Profile = {
    avatar: getAvatarOriginalSizeUrl(user.profile_image_url_https),
    banner: user.profile_banner_url,
    biography: user.description,
    followersCount: user.followers_count,
    followingCount: user.friends_count,
    friendsCount: user.friends_count,
    mediaCount: user.media_count,
    isPrivate: user.protected ?? false,
    isVerified: user.verified,
    likesCount: user.favourites_count,
    listedCount: user.listed_count,
    location: user.location,
    name: user.name,
    pinnedTweetIds: user.pinned_tweet_ids_str,
    tweetsCount: user.statuses_count,
    url: `https://twitter.com/${user.screen_name}`,
    userId: user.id_str,
    username: user.screen_name,
    isBlueVerified: isBlueVerified ?? false,
    canDm: user.can_dm,
  };

  if (user.created_at != null) {
    profile.joined = new Date(Date.parse(user.created_at));
  }

  const urls = user.entities?.url?.urls;
  if (urls?.length != null && urls?.length > 0) {
    profile.website = urls[0].expanded_url;
  }

  return profile;
}

export async function getProfile(
  username: string,
  auth: TwitterAuth,
): Promise<RequestApiResult<Profile>> {
  const params = new URLSearchParams();
  params.set(
    'variables',
    stringify({
      screen_name: username,
      withSafetyModeUserFields: true,
    }),
  );

  params.set(
    'features',
    stringify({
      hidden_profile_likes_enabled: false,
      hidden_profile_subscriptions_enabled: false, // Auth-restricted
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: false,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
    }),
  );

  params.set('fieldToggles', stringify({ withAuxiliaryUserLabels: false }));

  const res = await requestApi<UserRaw>(
    `https://twitter.com/i/api/graphql/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName?${params.toString()}`,
    auth,
  );
  if (!res.success) {
    return res;
  }

  const { value } = res;
  const { errors } = value;
  if (errors != null && errors.length > 0) {
    return {
      success: false,
      err: new Error(errors[0].message),
    };
  }

  if (!value.data || !value.data.user || !value.data.user.result) {
    return {
      success: false,
      err: new Error('User not found.'),
    };
  }
  const { result: user } = value.data.user;
  const { legacy } = user;

  if (user.rest_id == null || user.rest_id.length === 0) {
    return {
      success: false,
      err: new Error('rest_id not found.'),
    };
  }

  legacy.id_str = user.rest_id;

  if (legacy.screen_name == null || legacy.screen_name.length === 0) {
    return {
      success: false,
      err: new Error(`Either ${username} does not exist or is private.`),
    };
  }

  return {
    success: true,
    value: parseProfile(user.legacy, user.is_blue_verified),
  };
}

const idCache = new Map<string, string>();

export async function getUserIdByScreenName(
  screenName: string,
  auth: TwitterAuth,
): Promise<RequestApiResult<string>> {
  const cached = idCache.get(screenName);
  if (cached != null) {
    return { success: true, value: cached };
  }

  const profileRes = await getProfile(screenName, auth);
  if (!profileRes.success) {
    return profileRes;
  }

  const profile = profileRes.value;
  if (profile.userId != null) {
    idCache.set(screenName, profile.userId);

    return {
      success: true,
      value: profile.userId,
    };
  }

  return {
    success: false,
    err: new Error('User ID is undefined.'),
  };
}

export interface TwitterUser {
  id: number;
  id_str: string;
  name: string;
  screen_name: string;
  location: string;
  description: string;
  url: string | null;
  entities: {
    description: {
      urls: any[];
    };
  };
  protected: boolean;
  followers_count: number;
  fast_followers_count: number;
  normal_followers_count: number;
  friends_count: number;
  listed_count: number;
  created_at: string;
  favourites_count: number;
  utc_offset: any | null;
  time_zone: any | null;
  geo_enabled: boolean;
  verified: boolean;
  statuses_count: number;
  media_count: number;
  lang: any | null;
  contributors_enabled: boolean;
  is_translator: boolean;
  is_translation_enabled: boolean;
  profile_background_color: string;
  profile_background_image_url: string | null;
  profile_background_image_url_https: string | null;
  profile_background_tile: boolean;
  profile_image_url: string;
  profile_image_url_https: string;
  profile_link_color: string;
  profile_sidebar_border_color: string;
  profile_sidebar_fill_color: string;
  profile_text_color: string;
  profile_use_background_image: boolean;
  has_extended_profile: boolean;
  default_profile: boolean;
  default_profile_image: boolean;
  pinned_tweet_ids: number[];
  pinned_tweet_ids_str: string[];
  has_custom_timelines: boolean;
  can_dm: any | null;
  can_media_tag: boolean;
  following: boolean;
  follow_request_sent: boolean;
  notifications: boolean;
  muting: boolean;
  blocking: boolean;
  blocked_by: boolean;
  want_retweets: boolean;
  advertiser_account_type: string;
  advertiser_account_service_levels: any[];
  profile_interstitial_type: string;
  business_profile_state: string;
  translator_type: string;
  withheld_in_countries: any[];
  followed_by: boolean;
  ext_profile_image_shape: string;
  ext_is_blue_verified: boolean;
  require_some_consent: boolean;
}

export async function subscribeOnProfile(userId: string, auth: TwitterAuth) {
  const rawParams = {
    include_profile_interstitial_type: 1,
    include_blocking: 1,
    include_blocked_by: 1,
    include_followed_by: 1,
    include_want_retweets: 1,
    include_mute_edge: 1,
    include_can_dm: 1,
    include_can_media_tag: 1,
    include_ext_is_blue_verified: 1,
    include_ext_verified_type: 1,
    include_ext_profile_image_shape: 1,
    skip_status: 1,
    user_id: userId,
  };

  const formData = formurlencoded(rawParams);

  const headers = new Headers();
  headers.set('Origin', 'https://twitter.com');
  headers.set('Referer', 'https://twitter.com');
  headers.set('Sec-Fetch-Site', 'application/x-www-form-urlencoded');
  headers.set('Sec-Fetch-Site', 'same-origin');
  headers.set('Content-Type', 'application/x-www-form-urlencoded');

  const res = await requestApi<TwitterUser>(
    `https://twitter.com/i/api/1.1/friendships/create.json`,
    auth,
    'POST',
    formData,
    headers,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}
