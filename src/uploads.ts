import { TwitterAuth } from './auth';
import { requestApi } from './api';
import mime from 'mime-types';
import fs from 'fs/promises';
import { getVideoDurationInSeconds } from 'get-video-duration';
import FormData from 'form-data';
import { Headers } from 'headers-polyfill';
import path from 'path';

/**
 * uploads media files.
 *    media_category: 'dm_video' used for sending gif/vids in messages
 */
export async function uploadMedia(
  {
    absolutePathToFile,
    media_category,
  }: {
    absolutePathToFile: string;
    media_category: UploadInitParams['media_category'];
  },
  auth: TwitterAuth,
): Promise<string> {
  const media_type = mime.lookup(absolutePathToFile);

  if (!media_type) {
    throw new Error('unexpected media type of provided file');
  }

  const fileStats = await fs.stat(absolutePathToFile);

  const initParams: UploadInitParams = {
    media_category,
    media_type,
    total_bytes: fileStats.size.toString(),
  };
  if (media_type.includes('video')) {
    const videoDurationSeconds = await getVideoDurationInSeconds(
      absolutePathToFile,
    );
    initParams['video_duration_ms'] = (videoDurationSeconds * 1000).toString();
  }

  const uploadInitResponse = await uploadInit(initParams, auth);

  await uploadAppend(auth, {
    absolutePathToFile,
    media_id: uploadInitResponse.media_id_string,
  });

  const finalizeResponse = await uploadFinalize(
    auth,
    uploadInitResponse.media_id_string,
  );

  let uploaded = false;
  while (!uploaded) {
    await new Promise((res) =>
      setTimeout(() => {
        res(1);
      }, finalizeResponse.processing_info.check_after_secs * 1000),
    );
    const uploadStatusResponse = await uploadStatus(
      auth,
      uploadInitResponse.media_id_string,
    );
    uploaded = uploadStatusResponse.processing_info.state === 'succeeded';
  }

  return uploadInitResponse.media_id_string;
}

interface UploadInitParams {
  media_category: 'dm_video';
  total_bytes: string;
  media_type: string;
  video_duration_ms?: string;
}

interface UploadInitResponse {
  media_id: bigint;
  media_id_string: string;
  expires_after_secs: number;
  media_key: string;
}

async function uploadInit(
  initParams: UploadInitParams,
  auth: TwitterAuth,
): Promise<UploadInitResponse> {
  const queryParams = new URLSearchParams({
    command: 'INIT',
    ...initParams,
  });

  const headers = new Headers();
  headers.set('Content-Length', '0');
  headers.set('Origin', 'https://twitter.com');
  headers.set('Referer', 'https://twitter.com');
  headers.set('Sec-Fetch-Site', 'same-site');

  const res = await requestApi<UploadInitResponse>(
    `https://upload.twitter.com/i/media/upload.json?${queryParams.toString()}`,
    auth,
    'POST',
    undefined,
    headers,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

interface UploadAppendParams {
  media_id: string;
  absolutePathToFile: string;
}

async function uploadAppend(
  auth: TwitterAuth,
  { absolutePathToFile, media_id }: UploadAppendParams,
): Promise<void> {
  const queryParams = new URLSearchParams({
    command: 'APPEND',
    segment_index: '0',
    media_id,
  });

  // Create a new FormData instance
  const formData = new FormData();

  const videoData = await fs.readFile(absolutePathToFile);

  // Append the video file to the FormData object
  formData.append('media', videoData, {
    filename: path.basename(absolutePathToFile),
    contentType: 'application/octet-stream',
  });

  const headers = new Headers();
  headers.set('Origin', 'https://twitter.com');
  headers.set('Referer', 'https://twitter.com');
  headers.set('Sec-Fetch-Site', 'same-site');
  headers.set('Content-Disposition', 'form-data');
  headers.set('Content-Length', formData.getLengthSync().toString());
  Object.entries(formData.getHeaders()).forEach(([key, val]) =>
    headers.set(key, val),
  );

  const res = await requestApi<void>(
    `https://upload.twitter.com/i/media/upload.json?${queryParams.toString()}`,
    auth,
    'POST',
    formData.getBuffer(),
    headers,
  );

  if (!res.success) {
    throw res.err;
  }
}

interface UploadFinalizeResponse {
  media_id: bigint;
  media_id_string: string;
  media_key: string;
  size: number;
  expires_after_secs: number;
  processing_info: {
    state: 'pending' | string;
    check_after_secs: number;
  };
}

async function uploadFinalize(
  auth: TwitterAuth,
  media_id: string,
): Promise<UploadFinalizeResponse> {
  const queryParams = new URLSearchParams({
    command: 'FINALIZE',
    media_id,
    allow_async: 'true',
  });

  const headers = new Headers();
  headers.set('Content-Length', '0');
  headers.set('Origin', 'https://twitter.com');
  headers.set('Referer', 'https://twitter.com');
  headers.set('Sec-Fetch-Site', 'same-site');

  const res = await requestApi<UploadFinalizeResponse>(
    `https://upload.twitter.com/i/media/upload.json?${queryParams.toString()}`,
    auth,
    'POST',
    undefined,
    headers,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

interface UploadStatusResponse {
  media_id: bigint;
  media_id_string: string;
  media_key: string;
  size: number;
  expires_after_secs: number;
  video: {
    video_type: string;
  };
  processing_info: {
    state: 'succeeded' | 'pending';
    progress_percent: number;
  };
}

async function uploadStatus(
  auth: TwitterAuth,
  media_id: string,
): Promise<UploadStatusResponse> {
  const queryParams = new URLSearchParams({
    command: 'STATUS',
    media_id,
  });

  const headers = new Headers();
  headers.set('Content-Length', '0');
  headers.set('Origin', 'https://twitter.com');
  headers.set('Referer', 'https://twitter.com');
  headers.set('Sec-Fetch-Site', 'same-site');

  const res = await requestApi<UploadStatusResponse>(
    `https://upload.twitter.com/i/media/upload.json?${queryParams.toString()}`,
    auth,
    'GET',
    undefined,
    headers,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}
