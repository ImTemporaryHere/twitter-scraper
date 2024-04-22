import { getScraper } from './test-utils';
import * as path from 'path';

test('scraper can get dialogs', async () => {
  const scraper = await getScraper();

  const inboxInitialState = await scraper.getDialogs();

  expect(inboxInitialState.inbox_initial_state).toBeTruthy();
});

test('scraper can send message with gif', async () => {
  const scraper = await getScraper();

  const response = await scraper.sendMessage({
    conversation_id: '1770958267629605206',
    text: 'MATHAFACKA!!!!!',
    absolutePathToMedia: path.resolve('gif-for-message.mp4'),
  });

  expect(response).toBeTruthy();

  console.log('response', JSON.stringify(response));
}, 15000);
