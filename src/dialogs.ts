import { TwitterAuth } from './auth';
import { requestApi } from './api';
import { v1 } from 'uuid';
import { uploadMedia } from './uploads';
import { getProfile } from './profile';
import { Headers } from 'headers-polyfill';

interface MessageData {
  id: string;
  time: string;
  conversation_id: string;
  sender_id: string;
  text?: string;
  entities?: {
    hashtags: string[];
    symbols: string[];
    user_mentions: string[];
    urls: {
      url: string;
      expanded_url: string;
      display_url: string;
      indices: number[];
    }[];
  };
  attachment?: {
    animated_gif?: {
      id: string;
      id_str: string;
      indices: number[];
      media_url: string;
      media_url_https: string;
      url: string;
      display_url: string;
      expanded_url: string;
      type: string;
      original_info: {
        width: number;
        height: number;
      };
      sizes: {
        thumb: {
          w: number;
          h: number;
          resize: string;
        };
        medium: {
          w: number;
          h: number;
          resize: string;
        };
        small: {
          w: number;
          h: number;
          resize: string;
        };
        large: {
          w: number;
          h: number;
          resize: string;
        };
      };
      video_info?: {
        aspect_ratio: number[];
        variants: {
          bitrate: number;
          content_type: string;
          url: string;
        }[];
      };
      features: Record<any, any>;
      ext_alt_text: string;
      ext_media_color: {
        palette: {
          rgb: {
            red: number;
            green: number;
            blue: number;
          };
          percentage: number;
        }[];
      };
      ext: {
        mediaStats: {
          r: string;
          ttl: number;
        };
        altText: {
          r: {
            ok: string;
          };
          ttl: number;
        };
        mediaColor: {
          r: {
            ok: {
              palette: {
                rgb: {
                  red: number;
                  green: number;
                  blue: number;
                };
                percentage: number;
              }[];
            };
          };
          ttl: number;
        };
      };
      audio_only: boolean;
    };
  };
}

interface User {
  id: number;
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url: string;
  profile_image_url_https: string;
  following: boolean;
  follow_request_sent: boolean;
  description: string;
  entities: {
    url: {
      urls: {
        url: string;
        expanded_url: string;
        display_url: string;
        indices: number[];
      }[];
    };
    description: {
      urls: any[]; // Assuming there could be URLs in descriptions
    };
  };
  verified: boolean;
  is_blue_verified: boolean;
  protected: boolean;
  blocking: boolean;
  subscribed_by: boolean;
  can_media_tag: boolean;
  created_at: string;
  friends_count: number;
  followers_count: number;
}

interface Participant {
  user_id: string;
  join_time?: string;
  last_read_event_id: string;
  join_conversation_event_id?: string;
  is_admin?: boolean;
}

interface Conversation {
  conversation_id: string;
  type: string;
  sort_event_id: string;
  sort_timestamp: string;
  participants: Participant[];
  create_time?: string;
  created_by_user_id?: string;
  nsfw: boolean;
  notifications_disabled: boolean;
  mention_notifications_disabled: boolean;
  last_read_event_id: string;
  trusted: boolean;
  status: string;
  min_entry_id: string;
  max_entry_id: string;
  read_only?: boolean;
  muted?: boolean;
}

export interface InboxInitialState {
  inbox_initial_state: {
    last_seen_event_id: string;
    trusted_last_seen_event_id: string;
    untrusted_last_seen_event_id: string;
    cursor: string;
    inbox_timelines: {
      trusted: {
        status: string;
        min_entry_id: string;
      };
      untrusted: {
        status: string;
      };
    };
    entries: {
      message: {
        id: string;
        time: string;
        affects_sort: boolean;
        request_id: string;
        conversation_id: string;
        message_data: MessageData;
      };
    }[];
    users: Record<string, User>;
    conversations?: Record<string, Conversation>;
    key_registry_state: {
      status: string;
    };
  };
}

export async function getDialogs(
  auth: TwitterAuth,
  timeout?: number,
): Promise<InboxInitialState> {
  const params = new URLSearchParams({
    nsfw_filtering_enabled: 'false',
    include_profile_interstitial_type: '1',
    include_blocking: '1',
    include_blocked_by: '1',
    include_followed_by: '1',
    include_want_retweets: '1',
    include_mute_edge: '1',
    include_can_dm: '1',
    include_can_media_tag: '1',
    include_ext_is_blue_verified: '1',
    include_ext_verified_type: '1',
    include_ext_profile_image_shape: '1',
    skip_status: '1',
    dm_secret_conversations_enabled: 'false',
    krs_registration_enabled: 'true',
    cards_platform: 'Web-12',
    include_cards: '1',
    include_ext_alt_text: 'true',
    include_ext_limited_action_results: 'true',
    include_quote_count: 'true',
    include_reply_count: '1',
    tweet_mode: 'extended',
    include_ext_views: 'true',
    dm_users: 'true',
    include_groups: 'true',
    include_inbox_timelines: 'true',
    include_ext_media_color: 'true',
    supports_reactions: 'true',
    include_ext_edit_control: 'true',
    include_ext_business_affiliations_label: 'true',
    ext: 'mediaColor,altText,mediaStats,highlightedLabel,voiceInfo,birdwatchPivot,superFollowMetadata,unmentionInfo,editControl,article',
  });

  const res = await requestApi<InboxInitialState>(
    `https://twitter.com/i/api/1.1/dm/inbox_initial_state.json?${params.toString()}`,
    auth,
    undefined,
    undefined,
    undefined,
    timeout,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

export interface InboxTimelineResponse {
  inbox_timeline: {
    status: 'HAS_MORE' | 'AT_END';
    min_entry_id: string;
    entries: Array<{
      message: {
        id: string;
        time: string; // If this represents a timestamp, you might want to use number instead
        affects_sort: boolean;
        request_id: string;
        conversation_id: string;
        message_data: {
          id: string;
          time: string; // If this represents a timestamp, you might want to use number instead
          conversation_id: string;
          sender_id: string;
          text: string;
          entities: {
            hashtags: Array<{
              // Add the structure for hashtags if they exist
            }>;
            symbols: Array<{
              // Add the structure for symbols if they exist
            }>;
            user_mentions: Array<{
              screen_name: string;
              name: string;
              id: number;
              id_str: string;
              indices: [number, number];
            }>;
            urls: Array<{
              url: string;
              expanded_url: string;
              display_url: string;
              indices: [number, number];
            }>;
          };
          attachment?: {
            animated_gif?: {
              id: number;
              id_str: string;
              indices: [number, number];
              media_url: string;
              media_url_https: string;
              url: string;
              display_url: string;
              expanded_url: string;
              type: 'animated_gif';
              original_info: {
                width: number;
                height: number;
              };
              sizes: {
                large: {
                  w: number;
                  h: number;
                  resize: 'fit' | 'crop';
                };
                thumb: {
                  w: number;
                  h: number;
                  resize: 'fit' | 'crop';
                };
                medium: {
                  w: number;
                  h: number;
                  resize: 'fit' | 'crop';
                };
                small: {
                  w: number;
                  h: number;
                  resize: 'fit' | 'crop';
                };
              };
              video_info: {
                aspect_ratio: [number, number];
                variants: Array<{
                  bitrate: number;
                  content_type: string;
                  url: string;
                }>;
              };
              features: Record<string, unknown>;
              ext_alt_text: string;
              ext_media_color: {
                palette: Array<{
                  rgb: {
                    red: number;
                    green: number;
                    blue: number;
                  };
                  percentage: number;
                }>;
              };
              ext: {
                altText: {
                  r: {
                    ok: string;
                  };
                  ttl: number;
                };
                mediaColor: {
                  r: {
                    ok: {
                      palette: Array<{
                        rgb: {
                          red: number;
                          green: number;
                          blue: number;
                        };
                        percentage: number;
                      }>;
                    };
                  };
                  ttl: number;
                };
                mediaStats: {
                  r: string;
                  ttl: number;
                };
              };
              audio_only: boolean;
            };
          };
        };
      };
    }>;
    conversations: {
      [key: string]: {
        conversation_id: string;
        type: 'GROUP_DM';
        sort_event_id: string;
        sort_timestamp: string;
        participants: Array<{
          user_id: string;
          join_time: string;
          last_read_event_id: string;
          join_conversation_event_id: string;
          is_admin: boolean;
        }>;
        create_time: string;
        created_by_user_id: string;
        name: string;
        avatar_image_https: string;
        avatar: {
          image: {
            original_info: {
              url: string;
              width: number;
              height: number;
            };
          };
        };
        nsfw: boolean;
        notifications_disabled: boolean;
        mention_notifications_disabled: boolean;
        last_read_event_id: string;
        trusted: boolean;
        low_quality: boolean;
        muted: boolean;
        status: 'HAS_MORE' | 'AT_END';
        min_entry_id: string;
        max_entry_id: string;
      };
    };
  };
}

export async function getInboxTimeline(
  auth: TwitterAuth,
  max_id: string,
  timeout?: number,
): Promise<InboxTimelineResponse> {
  const params = new URLSearchParams({
    filter_low_quality: 'false',
    include_quality: 'all',
    max_id: max_id,
    nsfw_filtering_enabled: 'false',
    include_profile_interstitial_type: '1',
    include_blocking: '1',
    include_blocked_by: '1',
    include_followed_by: '1',
    include_want_retweets: '1',
    include_mute_edge: '1',
    include_can_dm: '1',
    include_can_media_tag: '1',
    include_ext_is_blue_verified: '1',
    include_ext_verified_type: '1',
    include_ext_profile_image_shape: '1',
    skip_status: '1',
    dm_secret_conversations_enabled: 'false',
    krs_registration_enabled: 'true',
    cards_platform: 'Web-12',
    include_cards: '1',
    include_ext_alt_text: 'true',
    include_ext_limited_action_results: 'true',
    include_quote_count: 'true',
    include_reply_count: '1',
    tweet_mode: 'extended',
    include_ext_views: 'true',
    dm_users: 'false',
    include_groups: 'true',
    include_inbox_timelines: 'true',
    include_ext_media_color: 'true',
    supports_reactions: 'true',
    include_ext_edit_control: 'true',
    ext: 'mediaColor,altText,businessAffiliationsLabel,mediaStats,highlightedLabel,voiceInfo,birdwatchPivot,superFollowMetadata,unmentionInfo,editControl,article',
  });

  const res = await requestApi<InboxTimelineResponse>(
    `https://twitter.com/i/api/1.1/dm/inbox_timeline/trusted.json?${params.toString()}`,
    auth,
    undefined,
    undefined,
    undefined,
    timeout,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

export interface SendMessageParams {
  conversation_id: string;
  absolutePathToMedia?: string;
  text?: string;
}

interface UserInResponse {
  id: string;
  id_str: string;
  name: string;
  screen_name: string;
  location: string | null;
  description: string | null;
  url: string | null;
  entities: {
    description: {
      urls: any[];
    };
  };
  protected: boolean;
  followers_count: number;
  friends_count: number;
  listed_count: number;
  created_at: string;
  favourites_count: number;
  utc_offset: number | null;
  time_zone: string | null;
  geo_enabled: boolean;
  verified: boolean;
  statuses_count: number;
  lang: string | null;
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
  default_profile: boolean;
  default_profile_image: boolean;
  can_dm: boolean | null;
  can_secret_dm: boolean | null;
  can_media_tag: boolean;
  following: boolean | null;
  follow_request_sent: boolean | null;
  notifications: boolean | null;
  blocking: boolean | null;
  subscribed_by: boolean | null;
  blocked_by: boolean | null;
  want_retweets: boolean | null;
  business_profile_state: string;
  translator_type: string;
  withheld_in_countries: string[];
  followed_by: boolean | null;
}

export interface SendMessageResponse {
  entries: Array<{
    message: {
      id: string;
      time: string;
      affects_sort: boolean;
      request_id: string;
      conversation_id: string;
      message_data: {
        id: string;
        time: string;
        conversation_id: string;
        sender_id: string;
        text: string;
      };
    };
  }>;
  users: Record<string, UserInResponse>;
}

export async function sendMessage(
  { conversation_id, absolutePathToMedia, text = '' }: SendMessageParams,
  auth: TwitterAuth,
) {
  if (!text && !absolutePathToMedia) {
    throw new Error('provide text or media id for the message to be sent');
  }

  const params = new URLSearchParams();
  const queryParams = {
    ext: 'mediaColor%2CaltText%2CmediaStats%2ChighlightedLabel%2CvoiceInfo%2CbirdwatchPivot%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Carticle',
    include_ext_alt_text: true,
    include_ext_limited_action_results: true,
    include_reply_count: 1,
    tweet_mode: 'extended',
    include_ext_views: true,
    include_groups: true,
    include_inbox_timelines: true,
    include_ext_media_color: true,
    supports_reactions: true,
  };
  Object.entries(queryParams).forEach(([key, value]) =>
    params.set(key, value.toString()),
  );

  const body: Record<string, any> = {
    conversation_id,
    recipient_ids: false,
    request_id: v1(),
    text,
    cards_platform: 'Web-12',
    include_cards: 1,
    include_quote_count: true,
    dm_users: false,
  };

  if (absolutePathToMedia) {
    const media_id = await uploadMedia(
      {
        absolutePathToFile: absolutePathToMedia,
      },
      auth,
    );

    body['media_id'] = media_id;
  }

  const res = await requestApi<SendMessageResponse>(
    `https://twitter.com/i/api/1.1/dm/new2.json?${params.toString()}`,
    auth,
    'POST',
    JSON.stringify(body),
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

export interface FetchConversationHistoryParams {
  conversationId: string;
  max_id?: string;
  min_id?: string;
}

export interface ConversationHistoryResponse {
  conversation_timeline: {
    status: string;
    min_entry_id: string;
    max_entry_id: string;
    entries: ConversationEntry[];
    users: {
      [userId: string]: UserProfile;
    };
  };
}

interface ConversationEntry {
  message: {
    id: string;
    time: string;
    request_id?: string;
    conversation_id: string;
    message_data: MessageData;
  };
}

interface UserProfile {
  id: string;
  id_str: string;
  name: string;
  screen_name: string;
  location: string | null;
  description: string | null;
  url: string | null;
  entities: {
    description: {
      urls: any[];
    };
  };
  protected: boolean;
  followers_count: number;
  friends_count: number;
  listed_count: number;
  created_at: string;
  favourites_count: number;
  utc_offset: any;
  time_zone: any;
  geo_enabled: boolean;
  verified: boolean;
  statuses_count: number;
  lang: any;
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
  default_profile: boolean;
  default_profile_image: boolean;
  can_dm: any;
  can_secret_dm: any;
  can_media_tag: boolean;
  following: boolean;
  follow_request_sent: boolean;
  notifications: boolean;
  blocking: boolean;
  subscribed_by: boolean;
  blocked_by: boolean;
  want_retweets: boolean;
  business_profile_state: string;
  translator_type: string;
  withheld_in_countries: any[];
  followed_by: boolean;
}

export async function fetchConversationHistory(
  auth: TwitterAuth,
  { min_id, max_id, conversationId }: FetchConversationHistoryParams,
): Promise<ConversationHistoryResponse> {
  const params = new URLSearchParams({
    // max_id, //id of the last message
    // context: 'FETCH_DM_CONVERSATION_HISTORY',
    // include_profile_interstitial_type: '1',
    // include_blocking: '1',
    // include_blocked_by: '1',
    // include_followed_by: '1',
    // include_want_retweets: '1',
    // include_mute_edge: '1',
    // include_can_dm: '1',
    // include_can_media_tag: '1',
    // include_ext_is_blue_verified: '1',
    // include_ext_verified_type: '1',
    // include_ext_profile_image_shape: '1',
    // skip_status: '1',
    // dm_secret_conversations_enabled: 'false',
    // krs_registration_enabled: 'true',
    // cards_platform: 'Web-12',
    // include_cards: '1',
    // include_ext_alt_text: 'true',
    // include_ext_limited_action_results: 'true',
    // include_quote_count: 'true',
    // include_reply_count: '1',
    // tweet_mode: 'extended',
    // include_ext_views: 'true',
    // dm_users: 'false',
    // include_groups: 'true',
    // include_inbox_timelines: 'true',
    // include_ext_media_color: 'true',
    // supports_reactions: 'true',
    // include_conversation_info: 'true',
    // ext: 'mediaColor,altText,mediaStats,highlightedLabel,voiceInfo,birdwatchPivot,superFollowMetadata,unmentionInfo,editControl,article'
  });

  if (max_id) {
    params.set('max_id', max_id);
  }

  if (min_id) {
    params.set('min_id', min_id);
  }

  const res = await requestApi<ConversationHistoryResponse>(
    `https://twitter.com/i/api/1.1/dm/conversation/${conversationId}.json?${params.toString()}`,
    auth,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

type AddParticipantsResponse = {
  data: {
    add_participants: {
      __typename: 'AddParticipantsSuccess';
      added_users: string[];
      participants_join_event: {
        dm_event_results: {
          result: {
            __typename: 'DMEvent';
            rest_id: string;
            id: string;
          };
          id: string;
        };
      };
    };
  };
};

export async function addParticipantToGroupConversation(
  userIdsList: string[],
  conversationId: string,
  auth: TwitterAuth,
) {
  const body = {
    variables: {
      addedParticipants: userIdsList,
      conversationId,
    },
    queryId: 'oBwyQ0_xVbAQ8FAyG0pCRA',
  };

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const res = await requestApi<AddParticipantsResponse>(
    `https://twitter.com/i/api/graphql/oBwyQ0_xVbAQ8FAyG0pCRA/AddParticipantsMutation`,
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
