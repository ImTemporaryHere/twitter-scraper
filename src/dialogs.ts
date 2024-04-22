import { TwitterAuth } from './auth';
import { requestApi, RequestApiResult } from './api';
import stringify from 'json-stable-stringify';
import { parseProfile, Profile, UserRaw } from './profile';
import {v1} from 'uuid';
import { uploadMedia } from './uploads';

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
      features: {};
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
    conversations: Record<string, Conversation>;
    key_registry_state: {
      status: string;
    };
  }
}


export async function getDialogs(
  auth: TwitterAuth,
): Promise<InboxInitialState> {
  const params = new URLSearchParams();
  const queryParams = {
    nsfw_filtering_enabled: false,
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
    dm_secret_conversations_enabled: false,
    krs_registration_enabled: true,
    cards_platform: 'Web-12',
    include_cards: 1,
    include_ext_alt_text: true,
    include_ext_limited_action_results: true,
    include_quote_count: true,
    include_reply_count: 1,
    tweet_mode: 'extended',
    include_ext_views: true,
    dm_users: true,
    include_groups: true,
    include_inbox_timelines: true,
    include_ext_media_color: true,
    supports_reactions: true,
    include_ext_edit_control: true,
    include_ext_business_affiliations_label: true,
    ext: 'mediaColor,altText,mediaStats,highlightedLabel,voiceInfo,birdwatchPivot,superFollowMetadata,unmentionInfo,editControl,article'
  }
  Object.entries(queryParams).forEach(([key,value])=>params.set(key,value.toString()))


  const res = await requestApi<InboxInitialState>(
    `https://twitter.com/i/api/1.1/dm/inbox_initial_state.json?${params.toString()}`,
    auth,
  );

  if (!res.success) {
    throw res.err
  }

  return res.value


}

export interface SendMessageParams {
  conversation_id: string,
  absolutePathToMedia?: string,
  text?: string
}


export async function sendMessage(
  {
    conversation_id,
   absolutePathToMedia,
    text
  }:SendMessageParams,
  auth: TwitterAuth,
): Promise<any> {

  if(!text && !absolutePathToMedia) {
    throw new Error('provide text or media id for the message to be sent')
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
  }
  Object.entries(queryParams).forEach(([key,value])=>params.set(key,value.toString()))


  const body: Record<string, any> = {
    conversation_id,
    "recipient_ids":false,
    "request_id": v1(),
    text,
    "cards_platform":"Web-12",
    "include_cards":1,
    "include_quote_count":true,
    "dm_users":false
  }

  if(absolutePathToMedia) {
    const media_id = await uploadMedia({
      media_category:'dm_video',
      absolutePathToFile:absolutePathToMedia
    },
      auth
    )

    body['media_id'] = media_id
  }


  const res = await requestApi<any>(
    `https://twitter.com/i/api/1.1/dm/new2.json?${params.toString()}`,
    auth,
    'POST',
    JSON.stringify(body)
  );

  if (!res.success) {
    throw res.err
  }

  return res.value


}

