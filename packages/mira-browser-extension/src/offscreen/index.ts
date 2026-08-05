import { stitch, crop } from './image-ops';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'STITCH') {
    stitch(msg.frames, msg.viewportHeight)
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((e: Error) => sendResponse({ error: e.message }));
    return true; // 异步响应
  }
  if (msg.type === 'CROP') {
    crop(msg.dataUrl, msg.rect)
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((e: Error) => sendResponse({ error: e.message }));
    return true;
  }
  return false;
});
