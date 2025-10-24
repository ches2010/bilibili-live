// 明确导入createVideoElement
import { createVideoElement } from './playerManager.js';

export function playFLV(url) {
  if (!window.flvjs || !flvjs.isSupported()) {
    throw new Error('浏览器不支持FLV播放');
  }

  const video = createVideoElement();
  const player = flvjs.createPlayer({
    type: 'flv',
    url: url
  }, {
    enableWorker: true,
    lazyLoadMaxDuration: 3 * 60,
    autoCleanupSourceBuffer: true
  });

  player.attachMediaElement(video);
  player.load();
  window.currentPlayer = player;
  return player;
}
