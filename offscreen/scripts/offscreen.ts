import { BrowserRuntimePostMessageStream } from '@metamask/post-message-stream';

const parentStream = new BrowserRuntimePostMessageStream({
  name: 'child',
  target: 'parent',
});

parentStream.on('data', (data) => {
  console.log('Offscreen Document received data from service worker', data);
});
