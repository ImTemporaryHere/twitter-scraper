import { getScraper } from './test-utils';
import * as path from 'path';
import fs from 'fs/promises';

test('scraper can get dialogs list', async () => {
  const scraper = await getScraper();

  const inboxInitialState = await scraper.getDialogs();

  expect(inboxInitialState.inbox_initial_state).toBeTruthy();

  const data = JSON.stringify(inboxInitialState);

  await fs.writeFile('./response-samples/initial-state.json', data, 'utf8');
});

test('scraper can get inbox timeline', async () => {
  const scraper = await getScraper();

  const response = await scraper.getInboxTimeline('1825851867852661089');

  expect(response).toBeTruthy();

  const data = JSON.stringify(response);

  await fs.writeFile('./response-samples/inbox-timeline-2.json', data, 'utf8');
});

test('scraper can send text message', async () => {
  const scraper = await getScraper();

  const response = await scraper.sendMessage({
    conversation_id: '1770958267629605206',
    text: 'scraper can send text message',
  });

  expect(response).toBeTruthy();
});

test('scraper can send gif', async () => {
  const scraper = await getScraper();

  const response = await scraper.sendMessage({
    conversation_id: '1770958267629605206',
    absolutePathToMedia: path.resolve('gif-for-message.mp4'),
  });

  expect(response).toBeTruthy();
}, 15000);

test('scraper can send text message with gif', async () => {
  const scraper = await getScraper();

  const response = await scraper.sendMessage({
    conversation_id: '1770958267629605206',
    text: 'scraper can send text message with gif',
    absolutePathToMedia: path.resolve('gif-for-message.mp4'),
  });

  expect(response).toBeTruthy();
}, 15000);

test('scraper can fetch conversation history', async () => {
  const scraper = await getScraper();

  const response = await scraper.fetchConversationHistory({
    max_id: '1782717127763386857',
    conversationId: '1770958267629605206',
  });

  expect(response).toBeTruthy();
});

test('scraper can add other users to group conversation', async () => {
  const scraper = await getScraper();

  const response = await scraper.addParticipantToGroupConversation(
    ['1759623353147547648'],
    '1771880900113866863',
  );

  expect(response).toBeTruthy();
});
