import { getScraper } from './test-utils';
import * as path from 'path';

test('scraper can get dialogs list', async () => {
  const scraper = await getScraper();

  const inboxInitialState = await scraper.getDialogs();

  expect(inboxInitialState.inbox_initial_state).toBeTruthy();

  console.log(JSON.stringify(inboxInitialState));
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

  console.log(JSON.stringify(response));
});
